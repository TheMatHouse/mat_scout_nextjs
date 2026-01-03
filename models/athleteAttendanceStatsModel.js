import mongoose from "mongoose";

const AthleteAttendanceStatsSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },

    lifetimeClasses: {
      type: Number,
      default: 0,
    },

    rankCycleClasses: {
      type: Number,
      default: 0,
    },

    currentRank: {
      type: String,
      default: null,
    },

    lastPromotionDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.AthleteAttendanceStats ||
  mongoose.model("AthleteAttendanceStats", AthleteAttendanceStatsSchema);
