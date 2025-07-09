import mongoose from "mongoose";

const reportForSchema = new mongoose.Schema(
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
  },
  { _id: false } // prevent automatic _id on subdocuments
);

const scoutingReportSchema = new mongoose.Schema(
  {
    reportFor: {
      type: [reportForSchema],
      validate: {
        validator: function (value) {
          const seen = new Set();
          for (const entry of value) {
            const key = `${entry.athleteId.toString()}-${entry.athleteType}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
          return true;
        },
        message: "Duplicate athlete entries are not allowed in reportFor.",
      },
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

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
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
