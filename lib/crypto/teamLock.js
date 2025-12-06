// lib/crypto/teamLock.js
// ---------------------------------------------------------------------------
//  TEAM LOCK / TBK ENCRYPTION ENGINE
// ---------------------------------------------------------------------------
//  This engine performs all cryptography for:
//   - Scouting Reports
//   - Coach Match Notes
//   - Video Notes
//
//  SECURITY MODEL
//  1. Team password → PBKDF2 → 32-byte derivation key
//  2. TBK (Team Box Key) = randomly generated 32 bytes
//  3. derivedKey wraps TBK using AES-256-GCM
//  4. Wrapped TBK + verifier stored in team.security
//  5. All data encryption uses the raw TBK
//
//  Changing the team password only rewraps TBK.
//  Existing encrypted data NEVER needs to be re-encrypted.
//
// ---------------------------------------------------------------------------

import crypto from "crypto";

/* ===========================================================================
   BASE64 HELPERS
=========================================================================== */
export function b64e(buf) {
  return Buffer.from(buf).toString("base64");
}

export function b64d(str) {
  return Buffer.from(str, "base64");
}

/* ===========================================================================
   KDF — PBKDF2 (Sync in Node)
=========================================================================== */
export function deriveKeyFromPassword(password, saltB64, iterations) {
  return crypto.pbkdf2Sync(password, b64d(saltB64), iterations, 32, "sha256");
}

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}

/* ===========================================================================
   AES-GCM WRAPPERS FOR TBK
=========================================================================== */

export function wrapTBK(derivedKey, tbkRaw) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

  const ciphertext = Buffer.concat([cipher.update(tbkRaw), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: b64e(ciphertext),
    ivB64: b64e(iv),
    tagB64: b64e(tag),
  };
}

export function unwrapTBK(derivedKey, wrapped) {
  const iv = b64d(wrapped.ivB64);
  const tag = b64d(wrapped.tagB64);
  const ciphertext = b64d(wrapped.ciphertextB64);

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(tag);

  const tbk = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return tbk; // raw 32-byte TBK
}

/* ===========================================================================
   TEAM LOCK STATUS
=========================================================================== */
export function teamHasLock(team) {
  return !!team?.security?.lockEnabled;
}

/* ===========================================================================
   INTERNAL AES-GCM FOR ARBITRARY PAYLOADS (Sensitive Data)
=========================================================================== */
function aesEncryptPayload(keyBytes, plaintextObj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(keyBytes),
    iv
  );

  const plaintext = Buffer.from(JSON.stringify(plaintextObj), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: b64e(ciphertext),
    ivB64: b64e(iv),
    tagB64: b64e(tag),
  };
}

function aesDecryptPayload(keyBytes, cryptoObj) {
  if (!cryptoObj?.ciphertextB64) return null;

  const iv = b64d(cryptoObj.ivB64);
  const tag = b64d(cryptoObj.tagB64);
  const ciphertext = b64d(cryptoObj.ciphertextB64);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyBytes),
    iv
  );
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

/* ===========================================================================
   SENSITIVE FIELD EXTRACTORS
=========================================================================== */
// ---- SCOUTING REPORT ----
function extractScoutingSensitive(r) {
  return {
    athleteAttackNotes: r.athleteAttackNotes || "",
    athleteGripNotes: r.athleteGripNotes || "",
    videoNotes: Array.isArray(r.videos)
      ? r.videos.map((v) => v.notes || "")
      : [],
  };
}

function applyDecScouting(r, dec) {
  if (!dec) return r;

  r.athleteAttackNotes = dec.athleteAttackNotes;
  r.athleteGripNotes = dec.athleteGripNotes;

  if (Array.isArray(r.videos) && Array.isArray(dec.videoNotes)) {
    r.videos = r.videos.map((v, i) => ({
      ...v,
      notes: dec.videoNotes[i] ?? "",
    }));
  }

  return r;
}

// ---- COACH MATCH NOTE ----
function extractCoachSensitive(n) {
  return {
    whatWentWell: n.whatWentWell || "",
    reinforce: n.reinforce || "",
    needsFix: n.needsFix || "",
    notes: n.notes || "",
  };
}

function applyDecCoach(note, dec) {
  if (!dec) return note;
  note.whatWentWell = dec.whatWentWell;
  note.reinforce = dec.reinforce;
  note.needsFix = dec.needsFix;
  note.notes = dec.notes;
  return note;
}

// ---- VIDEO NOTES ----
function extractVideoSensitive(v) {
  return { notes: v.notes || "" };
}

function applyDecVideo(v, dec) {
  if (!dec) return v;
  v.notes = dec.notes;
  return v;
}

/* ===========================================================================
   MAIN: ENCRYPT SCOUTING REPORT
=========================================================================== */
export async function encryptScoutingBody(team, report) {
  if (!teamHasLock(team)) {
    return { body: report, crypto: null };
  }

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing — unlock required.");

  const sensitive = extractScoutingSensitive(report);
  const cryptoObj = aesEncryptPayload(key, sensitive);

  // sanitized body
  const cleared = {
    ...report,
    athleteAttackNotes: "",
    athleteGripNotes: "",
    videos: Array.isArray(report.videos)
      ? report.videos.map((v) => ({ ...v, notes: "" }))
      : [],
  };

  return {
    body: cleared,
    crypto: cryptoObj,
  };
}

/* ===========================================================================
   MAIN: DECRYPT SCOUTING REPORT
=========================================================================== */
export async function decryptScoutingBody(team, report) {
  if (!teamHasLock(team) || !report?.crypto) return report;

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const dec = aesDecryptPayload(key, report.crypto);
  return applyDecScouting(report, dec);
}

/* ===========================================================================
   MAIN: ENCRYPT COACH NOTE
=========================================================================== */
export async function encryptCoachNoteBody(team, notePayload) {
  if (!teamHasLock(team)) {
    return { body: notePayload, crypto: null };
  }

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const sensitive = extractCoachSensitive(notePayload);
  const cryptoObj = aesEncryptPayload(key, sensitive);

  const cleared = {
    ...notePayload,
    whatWentWell: "",
    reinforce: "",
    needsFix: "",
    notes: "",
  };

  return { body: cleared, crypto: cryptoObj };
}

/* ===========================================================================
   MAIN: DECRYPT COACH NOTE
=========================================================================== */
export async function decryptCoachNoteBody(team, noteDoc) {
  if (!teamHasLock(team) || !noteDoc?.crypto) return noteDoc;

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const dec = aesDecryptPayload(key, noteDoc.crypto);
  return applyDecCoach(noteDoc, dec);
}

/* ===========================================================================
   MAIN: ENCRYPT VIDEO NOTES
=========================================================================== */
export async function encryptVideoNotes(team, video) {
  if (!teamHasLock(team)) return { video, crypto: null };

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const sensitive = extractVideoSensitive(video);
  const cryptoObj = aesEncryptPayload(key, sensitive);

  return {
    video: { ...video, notes: "" },
    crypto: cryptoObj,
  };
}

/* ===========================================================================
   MAIN: DECRYPT VIDEO NOTES
=========================================================================== */
export async function decryptVideoNotes(team, video) {
  if (!teamHasLock(team) || !video?.crypto) return video;

  const key = team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const dec = aesDecryptPayload(key, video.crypto);
  return applyDecVideo(video, dec);
}
