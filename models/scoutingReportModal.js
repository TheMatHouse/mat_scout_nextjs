import { Schema, model, models } from "mongoose";

const scoutingReportSchema = new Schema(
  {
    // athlete: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    // },
    access: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    athletes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    familyMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "FamilyMember",
      },
    ],
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    createdByName: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
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

export const ScoutingReport =
  models.ScoutingReport || model("ScoutingReport", scoutingReportSchema);
