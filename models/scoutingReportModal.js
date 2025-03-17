import mongoose from "mongoose";

const scoutingReportSchema = new mongoose.Schema(
  {
    // athlete: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    // },
    access: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    athletes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    familyMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FamilyMember",
      },
    ],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    createdByName: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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
    athleteNationalRank: {
      type: String,
    },
    athleteWorldRank: {
      type: String,
    },
    division: { type: String },
    weightCategory: {
      type: String,
    },
    athleteClub: { type: String },
    athleteCountry: { type: String },
    athleteRank: { type: String },
    athleteGrip: { type: String },
    athleteAttacks: [String],
    athleteAttackNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// export const ScoutingReport =
// models.ScoutingReport || model("ScoutingReport", scoutingReportSchema);

const ScoutingReport =
  mongoose.models.ScoutingReport ||
  mongoose.model("ScoutingReport", scoutingReportSchema);

export default ScoutingReport;
