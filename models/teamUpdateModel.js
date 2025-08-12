// models/teamUpdateModel.js
import mongoose from "mongoose";

const TeamUpdateSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true, trim: true, maxlength: 8000 },

    // Author fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // preferred
    authorId: { type: mongoose.Schema.Types.ObjectId }, // legacy back-compat
  },
  { timestamps: true }
);

export default mongoose.models.TeamUpdate ||
  mongoose.model("TeamUpdate", TeamUpdateSchema);
