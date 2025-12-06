// lib/crypto/locker.js
// ---------------------------------------------------------------------------
//  CLIENT-SIDE TEAM LOCK HELPERS
//  - Runs in the browser ONLY (WebCrypto, no Node 'crypto')
//  - Verifies password against team.security.verifierB64
//  - Unwraps TBK (Team Box Key) from team.security.wrappedTBK
//  - Caches TBK per team in-memory + sessionStorage
// ---------------------------------------------------------------------------

const TBK_KEY = (teamId) => `ms:team_tbk:${teamId}`;
const tbkCache = new Map();

/* ===========================================================================
   BASE64 HELPERS (BROWSER)
============================================================================ */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/* ===========================================================================
   WEBCRYPTO HELPERS (PBKDF2 + SHA-256)
============================================================================ */
async function pbkdf2DeriveKeyBytes(password, saltB64, iterations = 250000) {
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
    32 * 8 // 32 bytes
  );

  return new Uint8Array(bits);
}

async function sha256Bytes(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

/* ===========================================================================
   AES-GCM UNWRAP TBK (WEBCRYPTO)
============================================================================ */
async function unwrapTBKWeb(derivedKeyBytes, wrapped) {
  if (!wrapped?.ciphertextB64 || !wrapped?.ivB64 || !wrapped?.tagB64) {
    throw new Error("Invalid wrappedTBK format.");
  }

  const iv = b64ToBytes(wrapped.ivB64);
  const tag = b64ToBytes(wrapped.tagB64);
  const ciphertext = b64ToBytes(wrapped.ciphertextB64);

  // Append tag to ciphertext for WebCrypto AES-GCM
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedKeyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plainBuf = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      // WebCrypto expects authTag appended to ciphertext, which we did above
      tagLength: 128,
    },
    aesKey,
    combined
  );

  const tbkBytes = new Uint8Array(plainBuf);
  return tbkBytes;
}

/* ===========================================================================
   TBK CACHE HELPERS
============================================================================ */
export function getCachedTBK(teamId) {
  if (!teamId) return null;

  if (tbkCache.has(teamId)) {
    return tbkCache.get(teamId) || null;
  }

  try {
    const fromSession = sessionStorage.getItem(TBK_KEY(teamId));
    if (fromSession) {
      tbkCache.set(teamId, fromSession);
      return fromSession;
    }
  } catch {
    // ignore sessionStorage errors
  }

  return null;
}

function cacheTBK(teamId, tbkB64) {
  if (!teamId || !tbkB64) return;
  tbkCache.set(teamId, tbkB64);
  try {
    sessionStorage.setItem(TBK_KEY(teamId), tbkB64);
  } catch {
    // ignore quota / privacy errors
  }
}

/* ===========================================================================
   MAIN: VERIFY PASSWORD LOCALLY + UNWRAP TBK
============================================================================ */
/**
 * verifyPasswordLocally
 *
 * 1. Derive key from password + KDF (salt, iterations)
 * 2. Hash derived key with SHA-256, compare to verifierB64
 * 3. If match → unwrap TBK via AES-GCM
 * 4. Cache TBK (base64) per team and return true
 *
 * Returns: boolean
 */
export async function verifyPasswordLocally(password, security, teamId) {
  if (!password || !security) return false;

  const kdf = security.kdf;
  const verifierB64 = security.verifierB64;
  const wrappedTBK = security.wrappedTBK;

  if (!kdf?.saltB64 || !kdf?.iterations || !verifierB64 || !wrappedTBK) {
    console.warn("[locker] Missing security fields for verification.");
    return false;
  }

  try {
    // 1️⃣ Derive 32-byte key from password
    const derived = await pbkdf2DeriveKeyBytes(
      password,
      kdf.saltB64,
      kdf.iterations
    );

    // 2️⃣ SHA-256(derivedKey) → verifier check
    const digestBytes = await sha256Bytes(derived);
    const computedVerifier = bytesToB64(digestBytes);

    if (computedVerifier !== verifierB64) {
      return false;
    }

    // 3️⃣ Unwrap TBK with derived key
    const tbkBytes = await unwrapTBKWeb(derived, wrappedTBK);
    const tbkB64 = bytesToB64(tbkBytes);

    // 4️⃣ Cache TBK (in-memory + sessionStorage)
    if (teamId) {
      cacheTBK(teamId, tbkB64);
    }

    // Also expose on window for Node-side fetch helpers if needed
    if (typeof window !== "undefined") {
      window.__MS_TEAM_TBK__ = tbkB64;
    }

    return true;
  } catch (err) {
    console.error("[locker] verifyPasswordLocally failed:", err);
    return false;
  }
}
