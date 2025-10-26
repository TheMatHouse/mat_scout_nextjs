// models/coachEntryModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

const CoachEntrySchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "CoachEvent",
      required: true,
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    // Athlete snapshot + optional link to a User
    athlete: {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },
      name: { type: String, required: true, trim: true },
      club: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    notesCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Avoid dupes within the same event (partial index ignores soft-deleted)
CoachEntrySchema.index(
  { event: 1, "athlete.user": 1, "athlete.name": 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

export default models.CoachEntry || model("CoachEntry", CoachEntrySchema);
