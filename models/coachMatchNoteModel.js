// /models/coachMatchNoteModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

/* ---------------- Opponent (plaintext only, as requested) ---------------- */
const OpponentSchema = new Schema(
  {
    name: { type: String, trim: true },
    rank: { type: String, trim: true },
    club: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

/* ---------------- Techniques (plaintext if unlocked, omitted if encrypted) ---------------- */
const TechniquesSchema = new Schema(
  {
    ours: [{ type: String, trim: true }],
    theirs: [{ type: String, trim: true }],
  },
  { _id: false }
);

/* ---------------- Optional video section ---------------- */
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

/* ---------------- Encryption container (matches Team Scouting Reports) ---------------- */
const CryptoSchema = new Schema(
  {
    version: { type: Number, default: 1 },
    alg: { type: String, trim: true }, // e.g., "TEAMLOCK-COACH-NOTES-V1"
    ivB64: { type: String, trim: true },
    ciphertextB64: { type: String, trim: true }, // encrypted JSON payload
    wrappedReportKeyB64: { type: String, trim: true },
    teamKeyVersion: { type: Number, default: 0 }, // copy of team.security.encryption.keyVersion at encryption time
  },
  { _id: false }
);

/* ---------------- Main Coach Match Note Schema ---------------- */
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

    athleteName: { type: String, required: true, trim: true },

    opponent: { type: OpponentSchema, default: {} },

    // These will be empty when encrypted (payload stored in crypto)
    whatWentWell: { type: String, trim: true },
    reinforce: { type: String, trim: true },
    needsFix: { type: String, trim: true },
    techniques: { type: TechniquesSchema, default: { ours: [], theirs: [] } },
    notes: { type: String, trim: true },

    // Video information
    video: { type: VideoSchema, default: () => ({}) },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },

    /* ---------------- Encrypted payload (optional) ---------------- */
    crypto: { type: CryptoSchema, default: null },
  },
  { timestamps: true }
);

const CoachMatchNote =
  models.CoachMatchNote || model("CoachMatchNote", CoachMatchNoteSchema);

export default CoachMatchNote;
