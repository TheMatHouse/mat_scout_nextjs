// models/coachMatchNoteModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

/* --------------------- sub-schemas --------------------- */

const OpponentSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    rank: { type: String, trim: true, default: "" },
    club: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const TechniquesSchema = new Schema(
  {
    ours: [{ type: String, trim: true }],
    theirs: [{ type: String, trim: true }],
  },
  { _id: false }
);

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

/* --------------------- main schema --------------------- */

const CoachMatchNoteSchema = new Schema(
  {
    /* ---- ownership ---- */
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

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

    /* ---- athlete identity ---- */
    athleteId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    athleteType: {
      type: String,
      enum: ["user", "family"],
      required: true,
      index: true,
    },

    athleteName: {
      type: String,
      required: true,
      trim: true,
    },

    /* ---- note content ---- */
    opponent: {
      type: OpponentSchema,
      default: () => ({
        name: "",
        rank: "",
        club: "",
        country: "",
      }),
    },

    whatWentWell: { type: String, default: "", trim: true },
    reinforce: { type: String, default: "", trim: true },
    needsFix: { type: String, default: "", trim: true },

    techniques: {
      type: TechniquesSchema,
      default: { ours: [], theirs: [] },
    },

    result: {
      type: String,
      enum: ["win", "loss", "draw", ""],
      default: "",
    },

    score: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },

    video: {
      type: VideoSchema,
      default: () => ({}),
    },

    /* ---- audit ---- */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false, // 🔥 THIS IS THE FIX
  }
);

/* --------------------- indexes --------------------- */

CoachMatchNoteSchema.index(
  { team: 1, athleteId: 1, deletedAt: 1 },
  { name: "team_athlete_active" }
);

const CoachMatchNote =
  models.CoachMatchNote || model("CoachMatchNote", CoachMatchNoteSchema);

export default CoachMatchNote;
