// lib/crypto/teamSecurityClient.js

// Derive a verifierB64 from a plaintext password using the same
// KDF parameters that are stored on the team:
//
//   - saltB64: base64-encoded salt
//   - iterations: number of PBKDF2 iterations
//
// Returns a base64 string (verifierB64) matching what the server
// expects in security.verifierB64.
export async function deriveTeamPasswordVerifierB64(
  password,
  saltB64,
  iterations
) {
  if (!password || !saltB64 || !iterations) {
    throw new Error("Missing password, saltB64, or iterations for KDF.");
  }

  // This must run in the browser where window.crypto.subtle exists
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("PBKDF2 not supported in this environment.");
  }

  const enc = new TextEncoder();

  // Decode base64 salt into bytes
  const saltBinary = window.atob(saltB64);
  const saltBytes = new Uint8Array(
    [...saltBinary].map((ch) => ch.charCodeAt(0))
  );

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  // Derive 32 bytes (256 bits) using SHA-256
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: Number(iterations) || 150000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  const bytes = new Uint8Array(bits);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Encode derived bytes as base64
  return window.btoa(binary);
}
