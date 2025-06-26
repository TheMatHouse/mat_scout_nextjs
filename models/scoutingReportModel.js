import mongoose from "mongoose";

const scoutingReportSchema = new mongoose.Schema(
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

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },

    // Optional: team who created it (if coach is on team)
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },

    // Match-specific scouting info
    matchType: {
      type: String,
      required: true,
    },
    athleteFirstName: {
      type: String,
      required: true,
    },
    athleteLastName: {
      type: String,
      required: true,
    },
    athleteNationalRank: String,
    athleteWorldRank: String,
    division: String,
    weightCategory: String,
    athleteClub: String,
    athleteCountry: String,
    athleteGrip: String,
    athleteAttacks: [String],
    athleteAttackNotes: String,
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    // Optional: who can view this (future-proofing)
    accessList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ScoutingReport =
  mongoose.models.ScoutingReport ||
  mongoose.model("ScoutingReport", scoutingReportSchema);

export default ScoutingReport;
