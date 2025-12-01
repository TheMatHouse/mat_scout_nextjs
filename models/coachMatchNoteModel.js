// /models/coachMatchNoteModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

/* ---------------- Opponent (plaintext) ---------------- */
const OpponentSchema = new Schema(
  {
    name: { type: String, trim: true },
    rank: { type: String, trim: true },
    club: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

/* ---------------- Techniques ---------------- */
const TechniquesSchema = new Schema(
  {
    ours: [{ type: String, trim: true }],
    theirs: [{ type: String, trim: true }],
  },
  { _id: false }
);

/* ---------------- Video ---------------- */
const VideoSchema = new Schema(
  {
    url: { type: String, default: null, trim: true },
    publicId: { type: String, default: null, trim: true },
    startMs: { type: Number, default: 0, min: 0 },
    label: { type: String, default: "", trim: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null },
  },
  { _id: false }
);

/* ---------------- Crypto (TBK AES-GCM) ---------------- */
const CryptoSchema = new Schema(
  {
    version: { type: Number, default: 1 },
    alg: { type: String, trim: true }, // "TEAMLOCK-COACH-NOTES-V1"
    ivB64: { type: String, trim: true },
    ciphertextB64: { type: String, trim: true },
    wrappedNoteKeyB64: { type: String, trim: true }, // <-- FIXED NAME
    teamKeyVersion: { type: Number, default: 0 },
  },
  { _id: false }
);

/* ---------------- Main Schema ---------------- */
const CoachMatchNoteSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "CoachEvent",
      required: true,
      index: true,
    },
    entry: {
      type: Schema.Types.ObjectId,
      ref: "CoachEntry",
      required: true,
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    athleteUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    athleteFamilyMemberId: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
    },

    /* Required in plaintext mode. Ignored when encrypted. */
    athleteName: {
      type: String,
      required: function () {
        return !this.crypto || !this.crypto.ciphertextB64;
      },
      trim: true,
    },

    opponent: { type: OpponentSchema, default: {} },

    /* Sensitive fields (blank when encrypted) */
    whatWentWell: { type: String, trim: true },
    reinforce: { type: String, trim: true },
    needsFix: { type: String, trim: true },
    notes: { type: String, trim: true },

    techniques: { type: TechniquesSchema, default: { ours: [], theirs: [] } },

    result: { type: String, trim: true },
    score: { type: String, trim: true },

    video: { type: VideoSchema, default: () => ({}) },

    deletedAt: { type: Date, default: null },

    /* Encrypted payload (AES-GCM TBK) */
    crypto: { type: CryptoSchema, default: null },
  },
  { timestamps: true }
);

const CoachMatchNote =
  models.CoachMatchNote || model("CoachMatchNote", CoachMatchNoteSchema);

export default CoachMatchNote;
