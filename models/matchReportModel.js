import { Schema, model, models } from "mongoose";

const matchReportSchema = new Schema(
  {
    athlete: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    familyMember: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
    },
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
    eventName: { type: String },
    matchDate: { type: Date, required: true },
    opponentName: {
      type: String,
      required: true,
    },
    division: { type: String },
    weightCategory: { type: String },
    opponentClub: { type: String },
    opponentCountry: { type: String },
    opponentRank: { type: String },
    opponentGrip: { type: String },
    opponentAttacks: [String],
    opponentAttackNotes: { type: String },
    athleteAttacks: [String],
    athleteAttackNotes: { type: String },
    result: { type: String },
    score: { type: String },
    videoTitle: { type: String },
    videoURL: { type: String },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const MatchReport =
  models.MatchReport || model("MatchReport", matchReportSchema);
