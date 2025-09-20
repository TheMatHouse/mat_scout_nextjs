// models/matchReportModel.js
import mongoose from "mongoose";

const matchReportSchema = new mongoose.Schema(
  {
    athleteId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    athleteType: {
      type: String,
      enum: ["user", "family"],
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Style (your style collection name)
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "styleModel",
    },

    matchType: { type: String, required: true },
    eventName: { type: String },
    matchDate: { type: Date, required: true },

    // Athlete ranks at time of match (labels)
    myRank: { type: String },
    opponentRank: { type: String },

    opponentName: { type: String, required: true },

    // Division & Weights
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "division", // <- your division model
    },
    weightCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "weightCategory", // <- category set (e.g., "IJF Senior Men")
    },
    weightItemId: { type: String }, // <- EXACT item _id inside weightCategory
    weightLabel: { type: String }, // <- snapshot label (e.g., "73 kg")
    weightUnit: { type: String, enum: ["kg", "lb"] }, // <- snapshot unit

    opponentClub: { type: String },
    opponentCountry: { type: String },

    opponentGrip: { type: String },
    opponentAttacks: [String],
    opponentAttackNotes: { type: String },
    athleteAttacks: [String],
    athleteAttackNotes: { type: String },

    result: { type: String },
    score: { type: String },

    video: {
      videoTitle: { type: String },
      videoNotes: { type: String },
      videoURL: { type: String },
    },

    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const matchReport =
  mongoose.models.matchReport ||
  mongoose.model("matchReport", matchReportSchema);

export default matchReport;
