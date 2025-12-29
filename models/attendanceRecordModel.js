import mongoose from "mongoose";

const AttendanceRecordSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
      index: true,
    },

    classInstance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassInstance",
      default: null,
      index: true,
    },

    // fallback for free users or unknown clubs
    clubNameFallback: {
      type: String,
      trim: true,
      default: null,
    },

    discipline: {
      type: String,
      trim: true,
      default: null,
    },

    attendedAt: {
      type: Date,
      required: true,
      index: true,
    },

    classType: {
      type: String,
      enum: ["technique", "kata", "randori", "conditioning", "open", "seminar"],
      default: null,
    },

    createdBy: {
      type: String,
      enum: ["athlete", "coach"],
      required: true,
    },

    visibility: {
      type: String,
      enum: ["private", "team", "public"],
      default: "private",
    },
  },
  { timestamps: true }
);

export default mongoose.models.AttendanceRecord ||
  mongoose.model("AttendanceRecord", AttendanceRecordSchema);
