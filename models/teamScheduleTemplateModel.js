import mongoose from "mongoose";

const TeamScheduleTemplateSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true, // "Advanced Training"
      trim: true,
    },

    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // Sunday = 0
    },

    startTime: {
      type: String,
      required: true, // "19:00"
      match: /^\d{2}:\d{2}$/,
    },

    durationMinutes: {
      type: Number,
      default: 90,
    },

    classComponents: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

TeamScheduleTemplateSchema.index({
  team: 1,
  dayOfWeek: 1,
  active: 1,
});

export default mongoose.models.TeamScheduleTemplate ||
  mongoose.model("TeamScheduleTemplate", TeamScheduleTemplateSchema);
