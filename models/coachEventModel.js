// /models/coachEventModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

const CoachEventSchema = new Schema(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CoachEventSchema.index(
  { team: 1, name: 1, startDate: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

const CoachEvent = models.CoachEvent || model("CoachEvent", CoachEventSchema);
export default CoachEvent;
