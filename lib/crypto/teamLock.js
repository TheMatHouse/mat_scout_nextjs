// lib/crypto/teamLock.js
import {
  encryptJSON,
  decryptToken,
  isEncryptedToken,
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

// Simple in-memory cache for Team Box Keys per session
const TBK_CACHE = new Map(); // teamId -> Uint8Array

// ✅ Does this team HAVE a lock configured?
export function teamHasLock(team) {
  return (
    !!team?.security?.lockEnabled &&
    !!team?.security?.kdf?.saltB64 &&
    !!team?.security?.verifierB64
  );
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
  } catch {
    // ignore
  }
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

  if (typeof window !== "undefined") {
    setTeamKdfGlobals(team);
  }

  let pass = getCachedTeamPass(teamId);
  if (pass) return pass;

  // eslint-disable-next-line no-alert
  pass = window.prompt("This team is locked. Enter the team password:");
  if (!pass) throw new Error("Password required");

  const ok = await verifyPasswordLocally(pass, team.security);
  if (!ok) throw new Error("Incorrect team password");

  cacheTeamPass(teamId, pass);
  return pass;
}

// 🔐 Try to encrypt NOTES with the team password (legacy flow)
export async function maybeEncryptNotes(team, plaintext) {
  if (!plaintext || !teamHasLock(team)) {
    return plaintext;
  }

  const pass = await ensureTeamPass(team);
  if (!pass) {
    return plaintext;
  }

  const iters = team.security?.kdf?.iterations ?? 250000;
  return encryptJSON(pass, { athleteAttackNotes: plaintext }, iters);
}

// 🔓 Try to decrypt; if it's not encrypted, just hand it back (legacy flow)
export async function maybeDecryptNotes(team, value) {
  if (!isEncryptedToken(value)) {
    return { plaintext: value, encrypted: false };
  }

  const pass = await ensureTeamPass(team);
  const iters = team.security?.kdf?.iterations ?? 250000;
  const obj = await decryptToken(pass, value, iters);

  return {
    plaintext: obj?.athleteAttackNotes || "",
    encrypted: true,
  };
}

// ============================================================
// Team Box Key (TBK) helpers
// ============================================================

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

/**
 * ensureTeamPassAndTbk(team)
 * - Ensures team password is entered & verified
 * - Unwraps existing TBK or generates + wraps + persists a new one
 * - Caches TBK bytes in-memory for the session
 */
async function ensureTeamPassAndTbk(team) {
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

  let tbkBytes;

  if (wrapped && isWrappedTeamBoxKey(wrapped)) {
    tbkBytes = await unwrapTeamBoxKey(
      pass,
      wrapped,
      team.security?.kdf?.iterations
    );
  } else {
    if (typeof crypto === "undefined" || !crypto.subtle) {
      throw new Error("WebCrypto not available for Team Box Key generation");
    }

    tbkBytes = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key

    const wrappedNew = await wrapTeamBoxKey(
      pass,
      tbkBytes,
      team.security?.kdf?.iterations
    );

    await persistWrappedTeamKey(
      team,
      wrappedNew,
      encryption.teamKeyVersion || 1
    );

    if (!team.security) team.security = {};
    if (!team.security.encryption) team.security.encryption = {};
    team.security.encryption.wrappedTeamKeyB64 = wrappedNew;
  }

  TBK_CACHE.set(teamId, tbkBytes);
  return { pass, tbk: tbkBytes };
}

async function importAesKeyFromBytes(bytes) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available for AES operations");
  }

  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ============================================================
// Full-body encryption for team scouting reports (TBK-based)
// ============================================================

export async function encryptScoutingBody(team, sensitiveBody) {
  const payload = {
    athleteFirstName: sensitiveBody.athleteFirstName || "",
    athleteLastName: sensitiveBody.athleteLastName || "",
    athleteNationalRank: sensitiveBody.athleteNationalRank || "",
    athleteWorldRank: sensitiveBody.athleteWorldRank || "",
    athleteClub: sensitiveBody.athleteClub || "",
    athleteCountry: sensitiveBody.athleteCountry || "",
    athleteGrip: sensitiveBody.athleteGrip || "",
    athleteAttacks: Array.isArray(sensitiveBody.athleteAttacks)
      ? sensitiveBody.athleteAttacks
      : [],
    athleteAttackNotes: sensitiveBody.athleteAttackNotes || "",
  };

  if (!teamHasLock(team)) {
    return {
      body: payload,
      crypto: null,
    };
  }

  const { tbk } = await ensureTeamPassAndTbk(team);
  if (!tbk) {
    return {
      body: payload,
      crypto: null,
    };
  }

  const key = await importAesKeyFromBytes(tbk);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(JSON.stringify(payload));

  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes
  );
  const ctBytes = new Uint8Array(ctBuf);

  const ivB64 = bytesToB64(iv);
  const ciphertextB64 = bytesToB64(ctBytes);

  const blankBody = {
    athleteFirstName: "",
    athleteLastName: "",
    athleteNationalRank: "",
    athleteWorldRank: "",
    athleteClub: "",
    athleteCountry: "",
    athleteGrip: "",
    athleteAttacks: [],
    athleteAttackNotes: "",
  };

  const teamKeyVersion =
    team?.security?.encryption?.teamKeyVersion != null
      ? team.security.encryption.teamKeyVersion
      : 1;

  return {
    body: blankBody,
    crypto: {
      version: 1,
      alg: "TBK-AES-GCM-256",
      ivB64,
      ciphertextB64,
      wrappedReportKeyB64: "",
      teamKeyVersion,
    },
  };
}

export async function decryptScoutingBody(team, report) {
  if (!report?.crypto?.ciphertextB64) return null;

  const cryptoMeta = report.crypto || {};
  const alg = cryptoMeta.alg || "";

  if (
    alg === "TEAMLOCK-NOTES-V1" ||
    isEncryptedToken(cryptoMeta.ciphertextB64 || "")
  ) {
    const { plaintext } = await maybeDecryptNotes(
      team,
      cryptoMeta.ciphertextB64
    );
    if (!plaintext) return null;

    try {
      const parsed = JSON.parse(plaintext);
      return {
        athleteFirstName: parsed.athleteFirstName || "",
        athleteLastName: parsed.athleteLastName || "",
        athleteNationalRank: parsed.athleteNationalRank || "",
        athleteWorldRank: parsed.athleteWorldRank || "",
        athleteClub: parsed.athleteClub || "",
        athleteCountry: parsed.athleteCountry || "",
        athleteGrip: parsed.athleteGrip || "",
        athleteAttacks: Array.isArray(parsed.athleteAttacks)
          ? parsed.athleteAttacks
          : [],
        athleteAttackNotes: parsed.athleteAttackNotes || "",
      };
    } catch {
      return null;
    }
  }

  const { tbk } = await ensureTeamPassAndTbk(team);
  if (!tbk) return null;

  const key = await importAesKeyFromBytes(tbk);

  const iv = b64ToBytes(cryptoMeta.ivB64 || "");
  const ctBytes = b64ToBytes(cryptoMeta.ciphertextB64 || "");

  try {
    const ptBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ctBytes
    );
    const dec = new TextDecoder();
    const json = dec.decode(ptBuf);
    const parsed = JSON.parse(json);

    return {
      athleteFirstName: parsed.athleteFirstName || "",
      athleteLastName: parsed.athleteLastName || "",
      athleteNationalRank: parsed.athleteNationalRank || "",
      athleteWorldRank: parsed.athleteWorldRank || "",
      athleteClub: parsed.athleteClub || "",
      athleteCountry: parsed.athleteCountry || "",
      athleteGrip: parsed.athleteGrip || "",
      athleteAttacks: Array.isArray(parsed.athleteAttacks)
        ? parsed.athleteAttacks
        : [],
      athleteAttackNotes: parsed.athleteAttackNotes || "",
    };
  } catch (err) {
    console.error("decryptScoutingBody TBK decrypt error:", err);
    return null;
  }
}

// ============================================================
// Change team password (preserves TBK)
// ============================================================

/**
 * changeTeamPassword(team, newPassword)
 *
 * - Ensures the current password is known (will prompt if needed)
 * - Gets the existing TBK (unwraps or generates it)
 * - Generates new salt + verifier for the NEW password
 * - Re-wraps the TBK with the new password
 * - Sends everything to /api/teams/[slug]/password
 * - Updates local team.security + TBK cache
 */
export async function changeTeamPassword(team, newPassword) {
  const teamId = team?._id || team?.id;
  if (!teamId || !team?.security) {
    throw new Error("Invalid team object");
  }

  if (!newPassword) {
    throw new Error("New password is required");
  }

  const { pass: currentPass, tbk } = await ensureTeamPassAndTbk(team);
  if (!currentPass || !tbk) {
    throw new Error("Could not unlock team with current password");
  }

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
  if (!slug) {
    throw new Error("Team slug is missing");
  }

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
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (!team.security.kdf) team.security.kdf = {};
  team.security.kdf.saltB64 = newSaltB64;
  team.security.kdf.iterations = newIterations;
  team.security.verifierB64 = verifierB64;
  team.security.lockEnabled = true;

  if (!team.security.encryption) team.security.encryption = {};
  team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;

  TBK_CACHE.set(teamId, tbk);

  return true;
}
