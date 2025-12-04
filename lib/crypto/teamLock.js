// lib/crypto/teamLock.js
// Unified Team Lock + TBK encryption engine for Scouting Reports,
// Coach Notes, and Video Notes.

import crypto from "crypto";

/* -----------------------------------------------------------
   BASE64 HELPERS
----------------------------------------------------------- */
export function b64encode(uint) {
  return Buffer.from(uint).toString("base64");
}

export function b64decode(str) {
  return new Uint8Array(Buffer.from(str, "base64"));
}

/* -----------------------------------------------------------
   KDF — derive the TBK from password
----------------------------------------------------------- */
export async function deriveTeamKey(password, kdf) {
  if (!password || !kdf?.saltB64 || !kdf?.iterations)
    throw new Error("Invalid KDF parameters.");

  const salt = Buffer.from(kdf.saltB64, "base64");
  const key = await crypto.pbkdf2Sync(
    password,
    salt,
    kdf.iterations,
    32,
    "sha256"
  );
  return new Uint8Array(key);
}

/* -----------------------------------------------------------
   TBK DECRYPT SUPPORT
   Determines if a team has a usable lock
----------------------------------------------------------- */
export function teamHasLock(team) {
  if (!team?.security) return false;
  return !!team.security.lockEnabled;
}

/* -----------------------------------------------------------
   AES-GCM encrypt/decrypt
----------------------------------------------------------- */
function aesGcmEncrypt(keyBytes, plaintextObj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(keyBytes),
    iv
  );

  const plaintext = Buffer.from(JSON.stringify(plaintextObj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: encrypted.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
  };
}

function aesGcmDecrypt(keyBytes, cryptoObj) {
  if (!cryptoObj?.ciphertextB64) return null;

  const iv = Buffer.from(cryptoObj.ivB64, "base64");
  const tag = Buffer.from(cryptoObj.tagB64, "base64");
  const ciphertext = Buffer.from(cryptoObj.ciphertextB64, "base64");

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

/* -----------------------------------------------------------
   ENCRYPTION TARGETS — SCOUTING REPORT SENSITIVE FIELDS
----------------------------------------------------------- */
function extractScoutingSensitive(r) {
  return {
    athleteAttackNotes: r.athleteAttackNotes || "",
    athleteGripNotes: r.athleteGripNotes || "",
    videoNotes: Array.isArray(r.videos)
      ? r.videos.map((v) => v.notes || "")
      : [],
  };
}

function applyDecryptedScouting(r, dec) {
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

/* -----------------------------------------------------------
   ENCRYPTION TARGETS — COACH NOTE SENSITIVE FIELDS
----------------------------------------------------------- */
function extractCoachNoteSensitive(n) {
  return {
    whatWentWell: n.whatWentWell || "",
    reinforce: n.reinforce || "",
    needsFix: n.needsFix || "",
    notes: n.notes || "",
  };
}

function applyDecryptedCoachNote(note, dec) {
  if (!dec) return note;
  note.whatWentWell = dec.whatWentWell;
  note.reinforce = dec.reinforce;
  note.needsFix = dec.needsFix;
  note.notes = dec.notes;
  return note;
}

/* -----------------------------------------------------------
   ENCRYPTION TARGETS — VIDEO NOTES (standalone)
----------------------------------------------------------- */
function extractVideoSensitive(v) {
  return { notes: v.notes || "" };
}

function applyDecryptedVideo(v, dec) {
  if (!dec) return v;
  v.notes = dec.notes;
  return v;
}

/* -----------------------------------------------------------
   MAIN — ENCRYPT SCOUTING REPORT
----------------------------------------------------------- */
export async function encryptScoutingBody(team, report, teamKey) {
  if (!teamHasLock(team)) return { body: report, crypto: null };

  const key = teamKey ?? team._teamKey; // consumer may inject key
  if (!key) throw new Error("Team key missing — unlock required.");

  const sensitive = extractScoutingSensitive(report);
  const cryptoObj = aesGcmEncrypt(key, sensitive);

  // sanitized body
  return {
    body: {
      ...report,
      athleteAttackNotes: "",
      athleteGripNotes: "",
      videos: Array.isArray(report.videos)
        ? report.videos.map((v) => ({ ...v, notes: "" }))
        : [],
    },
    crypto: cryptoObj,
  };
}

/* -----------------------------------------------------------
   MAIN — DECRYPT SCOUTING REPORT
----------------------------------------------------------- */
export async function decryptScoutingBody(team, report, teamKey) {
  if (!teamHasLock(team) || !report?.crypto) return report;

  const key = teamKey ?? team._teamKey;
  if (!key) throw new Error("Team key missing — unlock required.");

  const dec = aesGcmDecrypt(key, report.crypto);
  return applyDecryptedScouting(report, dec);
}

/* -----------------------------------------------------------
   MAIN — ENCRYPT COACH NOTE
----------------------------------------------------------- */
export async function encryptCoachNoteBody(team, notePayload, teamKey) {
  if (!teamHasLock(team)) {
    return {
      clear: notePayload,
      crypto: null,
    };
  }

  const key = teamKey ?? team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const sensitive = extractCoachNoteSensitive(notePayload);
  const cryptoObj = aesGcmEncrypt(key, sensitive);

  const cleared = {
    ...notePayload,
    whatWentWell: "",
    reinforce: "",
    needsFix: "",
    notes: "",
  };

  return { clear: cleared, crypto: cryptoObj };
}

/* -----------------------------------------------------------
   MAIN — DECRYPT COACH NOTE
----------------------------------------------------------- */
export async function decryptCoachNoteBody(team, noteDoc, teamKey) {
  if (!teamHasLock(team) || !noteDoc?.crypto) return noteDoc;

  const key = teamKey ?? team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const dec = aesGcmDecrypt(key, noteDoc.crypto);
  return applyDecryptedCoachNote(noteDoc, dec);
}

/* -----------------------------------------------------------
   MAIN — ENCRYPT VIDEO NOTES
----------------------------------------------------------- */
export async function encryptVideoNotes(team, video, teamKey) {
  if (!teamHasLock(team)) return { video, crypto: null };

  const key = teamKey ?? team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const sensitive = extractVideoSensitive(video);
  const cryptoObj = aesGcmEncrypt(key, sensitive);

  return {
    video: { ...video, notes: "" },
    crypto: cryptoObj,
  };
}

/* -----------------------------------------------------------
   MAIN — DECRYPT VIDEO NOTES
----------------------------------------------------------- */
export async function decryptVideoNotes(team, video, teamKey) {
  if (!teamHasLock(team) || !video?.crypto) return video;

  const key = teamKey ?? team._teamKey;
  if (!key) throw new Error("Team key missing.");

  const dec = aesGcmDecrypt(key, video.crypto);
  return applyDecryptedVideo(video, dec);
}
