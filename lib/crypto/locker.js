// lib/crypto/locker.js

// ---- Base64 helpers ----
export function b64ToBytes(b64) {
  if (typeof window !== "undefined") {
    const bin = atob(b64 || "");
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node polyfill
  return new Uint8Array(Buffer.from(b64 || "", "base64"));
}

export function bytesToB64(bytes) {
  if (typeof window !== "undefined") {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  return Buffer.from(bytes).toString("base64");
}

// ---- PBKDF2 + SHA-256 primitives ----
async function pbkdf2Bytes(
  password,
  saltBytes,
  iterations = 250000,
  length = 32
) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

async function sha256(bytes) {
  const dig = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(dig);
}

// ---- Password verifier (already used) ----
/**
 * verifyPasswordLocally(password, security)
 * - security.kdf.saltB64
 * - security.kdf.iterations
 * - security.verifierB64
 */
export async function verifyPasswordLocally(password, security) {
  try {
    const salt = b64ToBytes(security?.kdf?.saltB64 || "");
    const iters = security?.kdf?.iterations || 250000;
    const dk = await pbkdf2Bytes(password, salt, iters, 32);
    const hash = await sha256(dk);
    const cmp = bytesToB64(hash);
    return cmp === (security?.verifierB64 || "");
  } catch (err) {
    console.error("verifyPasswordLocally error:", err);
    return false;
  }
}

// ---- Key derivation for AES-GCM (used by batchEncrypt + token helpers) ----
export async function deriveKeyFromPassword(
  password,
  saltB64,
  iterations = 250000
) {
  const saltBytes = b64ToBytes(saltB64 || "");
  const dk = await pbkdf2Bytes(password, saltBytes, iterations, 32);
  return crypto.subtle.importKey("raw", dk, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * encryptJson(key, obj, encVersion?)
 */
export async function encryptJson(key, obj, encVersion = "v1") {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(obj));

  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  const ctBytes = new Uint8Array(ctBuf);

  return {
    ivB64: bytesToB64(iv),
    ciphertextB64: bytesToB64(ctBytes),
    encVersion,
  };
}

// ---- Token-style helpers used by maybeEncryptNotes / maybeDecryptNotes ----
const TOKEN_PREFIX = "enc:";

export function isEncryptedToken(value) {
  return typeof value === "string" && value.startsWith(TOKEN_PREFIX);
}

function getTeamKdfConfig() {
  if (typeof window === "undefined") return null;
  const cfg = window.__MS_TEAM_SECURITY__;
  if (!cfg || !cfg.saltB64) return null;
  return {
    saltB64: cfg.saltB64,
    iterations: cfg.iterations || 250000,
  };
}

/**
 * encryptJSON(password, obj, iterations?)
 */
export async function encryptJSON(password, obj, iterationsOverride) {
  const kdf = getTeamKdfConfig();
  if (!kdf) {
    throw new Error(
      "Team KDF config not available on window.__MS_TEAM_SECURITY__"
    );
  }

  const iterations = iterationsOverride || kdf.iterations;
  const key = await deriveKeyFromPassword(password, kdf.saltB64, iterations);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(obj));

  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  const ctBytes = new Uint8Array(ctBuf);

  const ivB64 = bytesToB64(iv);
  const ctB64 = bytesToB64(ctBytes);

  return `${TOKEN_PREFIX}${ivB64}:${ctB64}`;
}

/**
 * decryptToken(password, token, iterations?)
 */
export async function decryptToken(password, token, iterationsOverride) {
  if (!isEncryptedToken(token)) {
    throw new Error("Value is not an encrypted token");
  }

  const kdf = getTeamKdfConfig();
  if (!kdf) {
    throw new Error(
      "Team KDF config not available on window.__MS_TEAM_SECURITY__"
    );
  }

  const iterations = iterationsOverride || kdf.iterations;
  const key = await deriveKeyFromPassword(password, kdf.saltB64, iterations);

  const withoutPrefix = token.slice(TOKEN_PREFIX.length);
  const [ivB64, ctB64] = withoutPrefix.split(":");
  const iv = b64ToBytes(ivB64);
  const ctBytes = b64ToBytes(ctB64);

  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ctBytes
  );
  const dec = new TextDecoder();
  const json = dec.decode(ptBuf);

  return JSON.parse(json);
}

// ============================================================
// Team Box Key (TBK) helpers
// ============================================================

const TBK_PREFIX = "tbk:";

export async function wrapTeamBoxKey(password, tbkBytes, iterationsOverride) {
  const kdf = getTeamKdfConfig();
  if (!kdf) {
    throw new Error(
      "Team KDF config not available on window.__MS_TEAM_SECURITY__"
    );
  }

  const iterations = iterationsOverride || kdf.iterations;
  const key = await deriveKeyFromPassword(password, kdf.saltB64, iterations);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    tbkBytes
  );
  const ctBytes = new Uint8Array(ctBuf);

  const ivB64 = bytesToB64(iv);
  const ctB64 = bytesToB64(ctBytes);

  return `${TBK_PREFIX}${ivB64}:${ctB64}`;
}

export function isWrappedTeamBoxKey(value) {
  return typeof value === "string" && value.startsWith(TBK_PREFIX);
}

export async function unwrapTeamBoxKey(password, wrapped, iterationsOverride) {
  if (!isWrappedTeamBoxKey(wrapped)) {
    throw new Error("Value is not a wrapped Team Box Key");
  }

  const kdf = getTeamKdfConfig();
  if (!kdf) {
    throw new Error(
      "Team KDF config not available on window.__MS_TEAM_SECURITY__"
    );
  }

  const iterations = iterationsOverride || kdf.iterations;
  const key = await deriveKeyFromPassword(password, kdf.saltB64, iterations);

  const withoutPrefix = wrapped.slice(TBK_PREFIX.length);
  const [ivB64, ctB64] = withoutPrefix.split(":");
  const iv = b64ToBytes(ivB64);
  const ctBytes = b64ToBytes(ctB64);

  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ctBytes
  );

  return new Uint8Array(ptBuf);
}

// ============================================================
// Extra helpers for password rotation
// ============================================================

export function randomSaltB64(length = 16) {
  const buf = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToB64(buf);
}

export async function derivePasswordVerifier(
  password,
  saltB64,
  iterationsOverride
) {
  const saltBytes = b64ToBytes(saltB64 || "");
  const iterations = iterationsOverride || 250000;
  const dk = await pbkdf2Bytes(password, saltBytes, iterations, 32);
  const hash = await sha256(dk);
  return bytesToB64(hash);
}
