import mongoose from "mongoose";

const matchReportSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // familyMember: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "FamilyMember",
    //   required: true,
    // },
    // team: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Team",
    // },
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
  {
    timestamps: true,
  }
);

// export const MatchReport =
//   models.MatchReport || model("MatchReport", matchReportSchema);

const MatchReport =
  mongoose.models.MatchReport ||
  mongoose.model("MatchReport", matchReportSchema);

export default MatchReport;
