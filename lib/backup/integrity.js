// lib/backup/integrity.js
import crypto from "crypto";

/** Return lowercase hex SHA-256 of a Buffer */
export function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** AES-256-GCM encrypt buffer with a passphrase; returns Buffers + metadata */
export function encryptAesGcm(buf, passphrase) {
  const salt = crypto.randomBytes(16); // for key derivation
  const iv = crypto.randomBytes(12); // GCM nonce
  const key = crypto.scryptSync(passphrase, salt, 32);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { ciphertext, salt, iv, tag };
}

/** (Optional) Decrypt previously encrypted buffer, for testing/restores */
export function decryptAesGcm({ ciphertext, salt, iv, tag }, passphrase) {
  const key = crypto.scryptSync(passphrase, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
