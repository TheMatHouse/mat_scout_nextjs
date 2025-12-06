// lib/crypto/locker.js
// ---------------------------------------------------------------------------
//  CLIENT-SIDE TEAM LOCK CRYPTO ENGINE (PRODUCTION-GRADE, BEST PRACTICE)
//  This file is the *single source of truth* for all browser crypto:
//    - PBKDF2 (deriveBits) → matches Node/OpenSSL 1:1
//    - SHA-256
//    - AES-GCM unwrap (ciphertext + tag)
//    - TBK caching (session + memory)
//    - verifyPasswordLocally()
// ---------------------------------------------------------------------------

const TBK_KEY = (teamId) => `ms:team_tbk:${teamId}`;
const tbkCache = new Map();

/* ========================================================================
   BASE64 HELPERS
========================================================================= */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/* ========================================================================
   PBKDF2 (deriveBits → 32 bytes) — EXACT MATCH WITH NODE/OPENSSL
========================================================================= */
async function deriveKeyBytes(password, saltB64, iterations) {
  if (!password || !saltB64 || !iterations)
    throw new Error("Missing PBKDF2 parameters.");

  const enc = new TextEncoder();
  const saltBytes = b64ToBytes(saltB64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations,
    },
    keyMaterial,
    32 * 8 // exactly 32 bytes like Node pbkdf2Sync(..., 32, ...)
  );

  return new Uint8Array(bits);
}

/* ========================================================================
   SHA-256 (raw bytes → raw bytes)
========================================================================= */
async function sha256Bytes(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

/* ========================================================================
   AES-GCM UNWRAP TBK
========================================================================= */
async function unwrapTBK(derivedKeyBytes, wrapped) {
  if (!wrapped || !wrapped.ivB64 || !wrapped.tagB64 || !wrapped.ciphertextB64) {
    throw new Error("Invalid wrapped TBK structure.");
  }

  const iv = b64ToBytes(wrapped.ivB64);
  const tag = b64ToBytes(wrapped.tagB64);
  const ct = b64ToBytes(wrapped.ciphertextB64);

  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct);
  combined.set(tag, ct.length);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedKeyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    aesKey,
    combined
  );

  return new Uint8Array(plain);
}

/* ========================================================================
   TBK CACHE HELPERS
========================================================================= */
export function getCachedTBK(teamId) {
  if (!teamId) return null;

  if (tbkCache.has(teamId)) return tbkCache.get(teamId);

  try {
    const stored = sessionStorage.getItem(TBK_KEY(teamId));
    if (stored) {
      tbkCache.set(teamId, stored);
      return stored;
    }
  } catch {
    // ignore sessionStorage failures
  }

  return null;
}

function cacheTBK(teamId, tbkB64) {
  if (!teamId || !tbkB64) return;

  tbkCache.set(teamId, tbkB64);
  try {
    sessionStorage.setItem(TBK_KEY(teamId), tbkB64);
  } catch {
    // ignore
  }
}

/* ========================================================================
   MAIN: VERIFY PASSWORD LOCALLY + UNWRAP TBK
========================================================================= */
export async function verifyPasswordLocally(password, security, teamId) {
  if (!password || !security) return false;

  const { kdf, verifierB64, wrappedTBK } = security;

  if (!kdf || !kdf.saltB64 || !kdf.iterations || !verifierB64 || !wrappedTBK) {
    console.warn("[locker] Missing required security fields.");
    return false;
  }

  try {
    // 1️⃣ Derive key bytes (PBKDF2)
    const derived = await deriveKeyBytes(password, kdf.saltB64, kdf.iterations);

    // 2️⃣ SHA-256(derived) → compare
    const digest = await sha256Bytes(derived);
    const localVerifier = bytesToB64(digest);

    if (localVerifier !== verifierB64) return false;

    // 3️⃣ Unwrap TBK
    const tbkBytes = await unwrapTBK(derived, wrappedTBK);
    const tbkB64 = bytesToB64(tbkBytes);

    // 4️⃣ Cache TBK
    if (teamId) cacheTBK(teamId, tbkB64);

    if (typeof window !== "undefined") {
      window.__MS_TEAM_TBK__ = tbkB64;
    }

    return true;
  } catch (err) {
    console.error("[locker] verifyPasswordLocally failed:", err);
    return false;
  }
}
