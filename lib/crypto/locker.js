// lib/crypto/locker.js
// FINAL — MATCHES BACKEND AES-GCM TEAM BOX KEY SYSTEM

//------------------------------------------------------------
// Base64 helpers
//------------------------------------------------------------
export function b64ToBytes(b64) {
  if (!b64) return new Uint8Array();
  if (typeof window !== "undefined") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function bytesToB64(bytes) {
  if (!bytes) return "";
  if (typeof window !== "undefined") {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  return Buffer.from(bytes).toString("base64");
}

//------------------------------------------------------------
// PBKDF2 + SHA-256
//------------------------------------------------------------
async function pbkdf2Bytes(password, saltBytes, iterations, length = 32) {
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
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(buf);
}

//------------------------------------------------------------
// STORE TBK PER TEAM
//------------------------------------------------------------
const TBK_KEY = (teamId) => `ms:teamlock:${teamId}`;

export function getCachedTBK(teamId) {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TBK_KEY(teamId)) || null;
}

export function clearCachedTBK(teamId) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TBK_KEY(teamId));
}

//------------------------------------------------------------
// MAIN — verify password & unwrap TBK
//------------------------------------------------------------
export async function verifyPasswordLocally(password, security, teamId) {
  if (!security?.kdf?.saltB64 || !security.verifierB64) return false;

  const saltBytes = b64ToBytes(security.kdf.saltB64);
  const iterations = security.kdf.iterations || 250000;

  // 1️⃣ Derive PBKDF2 key
  const derivedKey = await pbkdf2Bytes(password, saltBytes, iterations, 32);

  // 2️⃣ Verify hash(dk)
  const digest = await sha256(derivedKey);
  const computedVerifier = bytesToB64(digest);

  if (computedVerifier !== security.verifierB64) {
    return false; // INCORRECT PASSWORD
  }

  // 3️⃣ If no wrappedTBK, nothing to unwrap → OK
  if (!security.wrappedTBK) {
    return true;
  }

  const { ciphertextB64, ivB64, tagB64 } = security.wrappedTBK;
  if (!ciphertextB64 || !ivB64 || !tagB64) return false;

  // 4️⃣ Import key for AES-GCM decrypt
  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 5️⃣ Combine ciphertext + tag exactly like Node crypto
  const ct = b64ToBytes(ciphertextB64);
  const tag = b64ToBytes(tagB64);
  const iv = b64ToBytes(ivB64);

  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);

  // 6️⃣ AES-GCM decrypt TBK
  let tbkBytes;
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      combined
    );
    tbkBytes = new Uint8Array(plainBuf);
  } catch (err) {
    console.error("TBK unwrap failed:", err);
    return false;
  }

  // 7️⃣ Save TBK in session storage per team
  try {
    const tbkB64 = bytesToB64(tbkBytes);
    sessionStorage.setItem(TBK_KEY(teamId), tbkB64);
  } catch (err) {
    console.warn("Unable to store TBK:", err);
  }

  return true;
}
