import mongoose from "mongoose";

const PracticeItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["drill", "technique", "warm-up", "cool-down", "note"],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    videoUrl: {
      type: String,
      default: "",
    },

    videoTimestamp: {
      type: Number,
      default: null,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    externalInstructorName: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const PracticeNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 📅 date + time of practice / clinic / seminar
    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    // 🏷️ what kind of session this was
    sessionType: {
      type: String,
      enum: ["practice", "clinic", "seminar", "training-camp"],
      required: true,
      index: true,
    },

    // 🏫 hosting club
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
    },

    externalClubName: {
      type: String,
      default: "",
      trim: true,
    },

    // 👤 primary instructor
    primaryCoach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    externalCoachName: {
      type: String,
      default: "",
      trim: true,
    },

    // 🧠 structured practice content
    items: {
      type: [PracticeItemSchema],
      default: [],
    },

    // 📝 free-form notes (Editor.jsx)
    generalNotes: {
      type: String,
      default: "",
    },

    visibility: {
      type: String,
      enum: ["private", "team"],
      default: "private",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PracticeNote ||
  mongoose.model("PracticeNote", PracticeNoteSchema);
