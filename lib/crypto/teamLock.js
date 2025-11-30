// lib/crypto/teamLock.js
import {
  verifyPasswordLocally,
  b64ToBytes,
  bytesToB64,
  wrapTeamBoxKey,
  unwrapTeamBoxKey,
  isWrappedTeamBoxKey,
  randomSaltB64,
  derivePasswordVerifier,
} from "./locker";

const STORE_KEY = (teamId) => `ms:teamlock:${teamId}`;
const TBK_CACHE = new Map(); // teamId -> Uint8Array

export function teamHasLock(team) {
  return !!team?.security?.kdf?.saltB64 && !!team?.security?.verifierB64;
}

export function getCachedTeamPass(teamId) {
  try {
    return sessionStorage.getItem(STORE_KEY(teamId)) || "";
  } catch {
    return "";
  }
}

export function cacheTeamPass(teamId, pass) {
  try {
    if (pass) sessionStorage.setItem(STORE_KEY(teamId), pass);
  } catch {}
}

function setTeamKdfGlobals(team) {
  if (typeof window === "undefined") return;
  window.__MS_TEAM_SECURITY__ = {
    saltB64: team.security?.kdf?.saltB64 || "",
    iterations: team.security?.kdf?.iterations || 250000,
  };
}

export async function ensureTeamPass(team) {
  const teamId = team?._id || team?.id;
  if (!teamId || !teamHasLock(team)) return "";

  if (typeof window !== "undefined") setTeamKdfGlobals(team);

  let pass = getCachedTeamPass(teamId);
  if (pass) return pass;

  pass = window.prompt("This team is locked. Enter the team password:");
  if (!pass) throw new Error("Password required");

  const ok = await verifyPasswordLocally(pass, team.security);
  if (!ok) throw new Error("Incorrect team password");

  cacheTeamPass(teamId, pass);
  return pass;
}

export async function maybeEncryptNotes(_team, plaintext) {
  return plaintext || "";
}

export async function maybeDecryptNotes(_team, value) {
  return { plaintext: value || "", encrypted: false };
}

async function persistWrappedTeamKey(
  team,
  wrappedTeamKeyB64,
  teamKeyVersion = 1
) {
  try {
    const slug = team?.teamSlug || team?.slug || "";
    if (!slug || typeof fetch === "undefined") return;

    const res = await fetch(
      `/api/teams/${encodeURIComponent(slug)}/encryption`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wrappedTeamKeyB64,
          teamKeyVersion,
        }),
      }
    );

    if (!res.ok) {
      console.error(
        "Failed to persist wrapped Team Box Key:",
        await res.text()
      );
    }
  } catch (err) {
    console.error("Error persisting wrapped Team Box Key:", err);
  }
}

async function ensureTeamPassAndTbk(team, { allowGenerate = true } = {}) {
  const teamId = team?._id || team?.id;
  if (!teamId || !teamHasLock(team)) {
    return { pass: "", tbk: null };
  }

  const pass = await ensureTeamPass(team);
  if (!pass) throw new Error("Password required");

  if (TBK_CACHE.has(teamId)) {
    return { pass, tbk: TBK_CACHE.get(teamId) };
  }

  const encryption = team.security?.encryption || {};
  const wrapped = encryption.wrappedTeamKeyB64 || "";
  let tbkBytes = null;

  if (wrapped && isWrappedTeamBoxKey(wrapped)) {
    try {
      tbkBytes = await unwrapTeamBoxKey(
        pass,
        wrapped,
        team.security?.kdf?.iterations
      );
      console.log("[TBK] Successfully unwrapped Team Box Key");
    } catch (err) {
      console.warn("[TBK] Failed to unwrap existing TBK.", err);
      if (!allowGenerate) throw new Error("Unable to unwrap Team Box Key");
      tbkBytes = null;
    }
  }

  if (!tbkBytes) {
    if (!allowGenerate && wrapped) throw new Error("Missing valid TBK");
    if (!allowGenerate) throw new Error("TBK is not initialized");

    if (typeof crypto === "undefined" || !crypto.subtle) {
      throw new Error("WebCrypto not available");
    }

    tbkBytes = crypto.getRandomValues(new Uint8Array(32));
    const wrappedNew = await wrapTeamBoxKey(
      pass,
      tbkBytes,
      team.security?.kdf?.iterations
    );

    console.log("[TBK] Generated and wrapped new TBK");

    await persistWrappedTeamKey(
      team,
      wrappedNew,
      encryption.teamKeyVersion || 1
    );

    team.security = team.security || {};
    team.security.encryption = team.security.encryption || {};
    team.security.encryption.wrappedTeamKeyB64 = wrappedNew;
  }

  TBK_CACHE.set(teamId, tbkBytes);
  return { pass, tbk: tbkBytes };
}

async function ensureTbkForDecrypt(team) {
  const { tbk } = await ensureTeamPassAndTbk(team, { allowGenerate: false });
  if (!tbk) throw new Error("Unable to obtain TBK for decrypt");
  return tbk;
}

async function importAesKeyFromBytes(bytes) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available");
  }

  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ============================================================
// COACH NOTES ENCRYPTION (TBK-based)
// ============================================================

export async function encryptCoachNoteBody(team, sensitiveBody) {
  if (!teamHasLock(team)) {
    return {
      body: {
        whatWentWell: sensitiveBody.whatWentWell,
        reinforce: sensitiveBody.reinforce,
        needsFix: sensitiveBody.needsFix,
        notes: sensitiveBody.notes,
        techniques: sensitiveBody.techniques,
        result: sensitiveBody.result,
        score: sensitiveBody.score,
      },
      crypto: null,
    };
  }

  const { tbk } = await ensureTeamPassAndTbk(team, { allowGenerate: true });

  if (!tbk) {
    return {
      body: {
        whatWentWell: sensitiveBody.whatWentWell,
        reinforce: sensitiveBody.reinforce,
        needsFix: sensitiveBody.needsFix,
        notes: sensitiveBody.notes,
        techniques: sensitiveBody.techniques,
        result: sensitiveBody.result,
        score: sensitiveBody.score,
      },
      crypto: null,
    };
  }

  const key = await importAesKeyFromBytes(tbk);

  const payload = {
    whatWentWell: sensitiveBody.whatWentWell || "",
    reinforce: sensitiveBody.reinforce || "",
    needsFix: sensitiveBody.needsFix || "",
    notes: sensitiveBody.notes || "",
    techniques: sensitiveBody.techniques || { ours: [], theirs: [] },
    result: sensitiveBody.result || "",
    score: sensitiveBody.score || "",
  };

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(payload));

  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );

  const ciphertextB64 = bytesToB64(new Uint8Array(ctBuf));
  const ivB64 = bytesToB64(iv);

  const blankBody = {
    whatWentWell: "",
    reinforce: "",
    needsFix: "",
    notes: "",
    techniques: { ours: [], theirs: [] },
    result: "",
    score: "",
  };

  const teamKeyVersion =
    team?.security?.encryption?.teamKeyVersion != null
      ? team.security.encryption.teamKeyVersion
      : 1;

  return {
    body: blankBody,
    crypto: {
      version: 1,
      alg: "TBK-COACH-NOTES-AES-GCM-256",
      ivB64,
      ciphertextB64,
      wrappedReportKeyB64: "",
      teamKeyVersion,
    },
  };
}

export async function decryptCoachNoteBody(team, note) {
  const cryptoMeta = note?.crypto;
  if (!cryptoMeta?.ciphertextB64) {
    return {
      whatWentWell: note.whatWentWell || "",
      reinforce: note.reinforce || "",
      needsFix: note.needsFix || "",
      notes: note.notes || "",
      techniques: note.techniques || { ours: [], theirs: [] },
      result: note.result || "",
      score: note.score || "",
    };
  }

  if (cryptoMeta.alg !== "TBK-COACH-NOTES-AES-GCM-256") {
    console.warn("Unsupported alg for coach note:", cryptoMeta.alg);
    return null;
  }

  const tbk = await ensureTbkForDecrypt(team);
  const key = await importAesKeyFromBytes(tbk);

  const iv = b64ToBytes(cryptoMeta.ivB64);
  const ctBytes = b64ToBytes(cryptoMeta.ciphertextB64);

  try {
    const ptBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ctBytes
    );
    const dec = new TextDecoder();
    const json = JSON.parse(dec.decode(ptBuf));

    return {
      whatWentWell: json.whatWentWell || "",
      reinforce: json.reinforce || "",
      needsFix: json.needsFix || "",
      notes: json.notes || "",
      techniques: json.techniques || { ours: [], theirs: [] },
      result: json.result || "",
      score: json.score || "",
    };
  } catch (err) {
    console.warn("Decrypt coach note failed:", err);
    return null;
  }
}

// ============================================================
// Change team password (TBK kept)
// ============================================================

export async function changeTeamPassword(team, newPassword) {
  const teamId = team?._id || team?.id;
  if (!teamId || !team?.security) throw new Error("Invalid team object");

  if (!newPassword) throw new Error("New password is required");

  const { tbk } = await ensureTeamPassAndTbk(team, { allowGenerate: true });
  if (!tbk) throw new Error("Could not obtain TBK for password change");

  const newIterations = team.security?.kdf?.iterations || 250000;
  const newSaltB64 = randomSaltB64(16);

  if (typeof window !== "undefined") {
    window.__MS_TEAM_SECURITY__ = {
      saltB64: newSaltB64,
      iterations: newIterations,
    };
  }

  const verifierB64 = await derivePasswordVerifier(
    newPassword,
    newSaltB64,
    newIterations
  );

  const wrappedTeamKeyB64 = await wrapTeamBoxKey(
    newPassword,
    tbk,
    newIterations
  );

  const slug = team.teamSlug || team.slug || "";
  if (!slug) throw new Error("Missing slug");

  const res = await fetch(`/api/teams/${encodeURIComponent(slug)}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saltB64: newSaltB64,
      iterations: newIterations,
      verifierB64,
      wrappedTeamKeyB64,
      teamKeyVersion:
        team?.security?.encryption?.teamKeyVersion != null
          ? team.security.encryption.teamKeyVersion
          : 1,
    }),
  });

  if (!res.ok) {
    let msg = "Failed to update team password";
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }

  team.security.kdf.saltB64 = newSaltB64;
  team.security.kdf.iterations = newIterations;
  team.security.verifierB64 = verifierB64;
  team.security.lockEnabled = true;

  team.security.encryption = team.security.encryption || {};
  team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;

  TBK_CACHE.set(teamId, tbk);
  return true;
}
