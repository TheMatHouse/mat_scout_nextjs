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

// Simple in-memory cache for Team Box Keys per session
const TBK_CACHE = new Map(); // teamId -> Uint8Array

// ============================================================
// Lock / password helpers
// ============================================================

// ✅ Does this team have a PASSWORD configured?
//    - We intentionally do NOT tie this to lockEnabled.
//    - lockEnabled controls the UI gate (TeamUnlockGate).
//    - KDF + verifier indicate that a team password exists.
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

/**
 * ensureTeamPass(team)
 *
 * - If no password configured, returns "" (no-op).
 * - Otherwise:
 *   - Uses cached password from sessionStorage if available.
 *   - Otherwise prompts the user (fallback for non-gated flows).
 *   - Verifies the password locally using team.security.
 */
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

// ============================================================
// Legacy note helpers (now NO-OP stubs)
//
// We keep the exports to avoid breaking imports, but they no
// longer perform any encryption. All new flows use TBK-based
// full-body encryption instead.
// ============================================================

// 🔐 Legacy stub: no longer encrypts individual notes.
export async function maybeEncryptNotes(_team, plaintext) {
  return plaintext || "";
}

// 🔓 Legacy stub: always treats value as plaintext.
export async function maybeDecryptNotes(_team, value) {
  return {
    plaintext: value || "",
    encrypted: false,
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
 * ensureTeamPassAndTbk(team, { allowGenerate })
 * - Ensures team password is entered & verified (if configured)
 * - Unwraps existing TBK from team.security.encryption.wrappedTeamKeyB64
 * - Optionally generates + wraps + persists a new one if missing/invalid
 *   (only when allowGenerate === true, i.e. for encryption/rotation flows)
 *
 * NOTE:
 * - For decrypt flows, always call with { allowGenerate: false } via
 *   ensureTbkForDecrypt() so we never silently create a new TBK.
 */
async function ensureTeamPassAndTbk(team, { allowGenerate = true } = {}) {
  const teamId = team?._id || team?.id;
  if (!teamId || !teamHasLock(team)) {
    // No password configured -> no TBK can exist.
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
      console.log("[TBK] Successfully unwrapped Team Box Key from encryption");
    } catch (err) {
      console.warn("[TBK] Failed to unwrap existing Team Box Key.", err);
      if (!allowGenerate) {
        // For decryption flows, do NOT silently generate a new key.
        throw new Error("Unable to unwrap Team Box Key for decryption");
      }
      tbkBytes = null;
    }
  }

  // No wrapped key present (first-time encrypt) OR unwrap failed and generation allowed
  if (!tbkBytes) {
    if (!allowGenerate && wrapped) {
      // Wrapped key existed but we couldn't unwrap, and we're not allowed to generate.
      throw new Error("Missing valid Team Box Key for decryption");
    }

    if (!allowGenerate) {
      // No wrapped key and not allowed to create one (decrypt path).
      throw new Error("Team Box Key is not initialized");
    }

    if (typeof crypto === "undefined" || !crypto.subtle) {
      throw new Error("WebCrypto not available for Team Box Key generation");
    }

    tbkBytes = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key

    const wrappedNew = await wrapTeamBoxKey(
      pass,
      tbkBytes,
      team.security?.kdf?.iterations
    );

    console.log("[TBK] Generated and wrapped new Team Box Key");

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

// Helper specifically for decrypt paths: never silently generate a new TBK.
async function ensureTbkForDecrypt(team) {
  const { tbk } = await ensureTeamPassAndTbk(team, { allowGenerate: false });
  if (!tbk) {
    throw new Error("Unable to obtain Team Box Key for decryption");
  }
  return tbk;
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

/**
 * encryptScoutingBody(team, sensitiveBody)
 *
 * - If NO password is configured (no KDF/verifier) -> returns plaintext body, crypto = null.
 *   (Pre-encryption era: before first team password is ever set.)
 *
 * - If a password IS configured:
 *   - ensureTeamPassAndTbk(team, { allowGenerate: true }) will:
 *     - unwrap existing TBK, OR
 *     - generate + wrap + persist a new TBK if missing.
 *
 * - Once TBK exists, all reports for that team are encrypted with it.
 */
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

  // If no password configured at all, keep everything plaintext.
  if (!teamHasLock(team)) {
    return {
      body: payload,
      crypto: null,
    };
  }

  // For encryption we ARE allowed to generate a TBK if needed.
  const { tbk } = await ensureTeamPassAndTbk(team, { allowGenerate: true });
  if (!tbk) {
    // Should be rare, but fall back to plaintext if TBK can't be obtained.
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

  // Store blank body in DB; real content lives in crypto.ciphertextB64
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

/**
 * decryptScoutingBody(team, report)
 *
 * - If report has no crypto.ciphertextB64:
 *   - Treat it as plaintext (either report.body or top-level fields).
 *
 * - If crypto.alg === "TBK-AES-GCM-256":
 *   - Uses TBK to decrypt full body.
 *
 * - No legacy per-note encryption is supported anymore.
 *   - maybeDecryptNotes() is now a no-op stub kept only for imports.
 */
export async function decryptScoutingBody(team, report) {
  if (!report) return null;

  const cryptoMeta = report.crypto || {};

  // Plaintext / pre-encryption era: no ciphertext present.
  if (!cryptoMeta.ciphertextB64) {
    const source = report.body || report;

    return {
      athleteFirstName: source.athleteFirstName || "",
      athleteLastName: source.athleteLastName || "",
      athleteNationalRank: source.athleteNationalRank || "",
      athleteWorldRank: source.athleteWorldRank || "",
      athleteClub: source.athleteClub || "",
      athleteCountry: source.athleteCountry || "",
      athleteGrip: source.athleteGrip || "",
      athleteAttacks: Array.isArray(source.athleteAttacks)
        ? source.athleteAttacks
        : [],
      athleteAttackNotes: source.athleteAttackNotes || "",
    };
  }

  const alg = cryptoMeta.alg || "";

  // Only support TBK-based full-body encryption going forward.
  if (alg !== "TBK-AES-GCM-256") {
    console.warn(
      "decryptScoutingBody: unsupported crypto.alg; treating as undecryptable",
      alg
    );
    return null;
  }

  const tbk = await ensureTbkForDecrypt(team);
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
    // Decrypt failures are normal for bad key/IV/tag or unknown old data.
    console.warn(
      "decryptScoutingBody TBK decrypt failed for report",
      report?._id || report?.id,
      err
    );
    return null;
  }
}

// ============================================================
// Change team password (preserves TBK where possible)
// ============================================================

/**
 * changeTeamPassword(team, newPassword)
 *
 * - Ensures the current password is known (will prompt if needed)
 * - Gets the existing TBK (unwraps or generates it if missing)
 * - Generates new salt + verifier for the NEW password
 * - Re-wraps the TBK with the new password
 * - Sends everything to /api/teams/[slug]/password
 * - Updates local team.security + TBK cache
 *
 * NOTE:
 * - This does NOT re-encrypt any scouting reports.
 * - All existing report.crypto entries remain valid because the TBK
 *   itself never changes; only its wrapping key changes.
 */
export async function changeTeamPassword(team, newPassword) {
  const teamId = team?._id || team?.id;
  if (!teamId || !team?.security) {
    throw new Error("Invalid team object");
  }

  if (!newPassword) {
    throw new Error("New password is required");
  }

  // For password change we ARE allowed to generate TBK if this is the first time.
  const { tbk } = await ensureTeamPassAndTbk(team, {
    allowGenerate: true,
  });
  if (!tbk) {
    throw new Error("Could not obtain Team Box Key for password change");
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
