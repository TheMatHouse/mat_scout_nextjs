// /models/coachMatchNoteModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

const OpponentSchema = new Schema(
  {
    name: { type: String, trim: true },
    rank: { type: String, trim: true },
    club: { type: String, trim: true },
    country: { type: String, trim: true },
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
    athleteName: { type: String, required: true, trim: true }, // denormalized for convenience
    opponent: { type: OpponentSchema, default: {} },
    whatWentWell: { type: String, trim: true },
    reinforce: { type: String, trim: true },
    needsFix: { type: String, trim: true },
    techniques: { type: TechniquesSchema, default: { ours: [], theirs: [] } },
    result: { type: String, enum: ["win", "loss", "draw", ""], default: "" },
    score: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const CoachMatchNote =
  models.CoachMatchNote || model("CoachMatchNote", CoachMatchNoteSchema);
export default CoachMatchNote;
