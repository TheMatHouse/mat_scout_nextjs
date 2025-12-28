import mongoose from "mongoose";

const ClassInstanceSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },

    scheduleTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClubScheduleTemplate",
      default: null,
    },

    name: {
      type: String,
      required: true, // snapshot: "Advanced Training"
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      required: true,
    },

    classType: {
      type: String,
      enum: ["technique", "kata", "randori", "conditioning", "open", "seminar"],
      default: null,
    },

    createdBy: {
      type: String,
      enum: ["system", "coach"],
      default: "system",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ClassInstance ||
  mongoose.model("ClassInstance", ClassInstanceSchema);
