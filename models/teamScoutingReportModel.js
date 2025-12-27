// models/teamScoutingReportModel.js
import mongoose from "mongoose";
import "@/models/weightCategoryModel";

const reportForSchema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, required: true },
    athleteType: { type: String, enum: ["user", "family"], required: true },
  },
  { _id: false }
);

// --- Encryption container for team scouting reports ---
const cryptoSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 1 },
    alg: { type: String, trim: true },
    ivB64: { type: String, trim: true },
    ciphertextB64: { type: String, trim: true },
    wrappedReportKeyB64: { type: String, trim: true },
    teamKeyVersion: { type: Number, default: 0 },
  },
  { _id: false }
);

const teamScoutingReportSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------
       WHO / ACCESS
    --------------------------------------------------------- */
    reportFor: {
      type: [reportForSchema],
      validate: {
        validator: function (value) {
          const seen = new Set();
          for (const entry of value || []) {
            const key = `${entry.athleteId?.toString?.() || ""}-${
              entry.athleteType
            }`;
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
      required: true,
      index: true,
    },

    /* ---------------------------------------------------------
       CONTEXT
    --------------------------------------------------------- */
    matchType: { type: String, required: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: "styleModel" },

    athleteFirstName: {
      type: String,
      required: function () {
        return !this.crypto || !this.crypto.ciphertextB64;
      },
    },

    athleteLastName: {
      type: String,
      required: function () {
        return !this.crypto || !this.crypto.ciphertextB64;
      },
    },

    athleteNationalRank: String,
    athleteWorldRank: String,

    division: { type: mongoose.Schema.Types.ObjectId, ref: "division" },
    weightCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "weightCategory",
    },
    weightLabel: { type: String },
    weightUnit: { type: String, enum: ["kg", "lb"] },

    athleteClub: String,
    athleteCountry: String,
    athleteGrip: String,
    athleteAttacks: [String],
    athleteAttackNotes: String,

    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    accessList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    /* ---------------------------------------------------------
       Encrypted payload
    --------------------------------------------------------- */
    crypto: { type: cryptoSchema, default: null },

    /* ---------------------------------------------------------
       Soft delete fields
    --------------------------------------------------------- */
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Weight sanity check (unchanged)
teamScoutingReportSchema.pre("validate", async function () {
  if (this.weightCategory && this.weightLabel) {
    const cat = await this.model("weightCategory")
      .findById(this.weightCategory)
      .lean();
    if (cat) {
      const ok = (cat.items || []).some((i) => i.label === this.weightLabel);
      if (!ok) {
        this.invalidate("weightLabel", "Weight not in selected category");
      }
      this.weightUnit = cat.unit;
    }
  }
});

const TeamScoutingReport =
  mongoose.models.TeamScoutingReport ||
  mongoose.model("TeamScoutingReport", teamScoutingReportSchema);

export default TeamScoutingReport;
