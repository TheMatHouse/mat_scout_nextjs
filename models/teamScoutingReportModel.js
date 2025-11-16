// models/teamScoutingReportModel.js
import mongoose from "mongoose";

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
    alg: { type: String, trim: true }, // e.g., "TEAMLOCK-NOTES-V1"
    ivB64: { type: String, trim: true }, // reserved if we move to real AES-GCM envelope keys
    ciphertextB64: { type: String, trim: true }, // encrypted JSON body
    wrappedReportKeyB64: { type: String, trim: true }, // reserved for future
    teamKeyVersion: { type: Number, default: 0 }, // copy of TeamSecurity.encryption.keyVersion at encrypt time
  },
  { _id: false }
);

const teamScoutingReportSchema = new mongoose.Schema(
  {
    // WHO/ACCESS
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
    createdByName: { type: String, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

    // CONTEXT
    matchType: { type: String, required: true },
    style: { type: mongoose.Schema.Types.ObjectId, ref: "styleModel" },

    // TARGET ATHLETE (conditionally required)
    athleteFirstName: {
      type: String,
      required: function () {
        // If we DON'T have an encrypted body, require name in plaintext.
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

    // Division / weight (team version)
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

    // --- Encrypted payload (optional) ---
    crypto: { type: cryptoSchema, default: null },
  },
  { timestamps: true }
);

// ✅ Keep your weight sanity-check like the original scoutingReportSchema
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
      this.weightUnit = cat.unit; // auto-sync unit
    }
  }
});

const TeamScoutingReport =
  mongoose.models.TeamScoutingReport ||
  mongoose.model("TeamScoutingReport", teamScoutingReportSchema);

export default TeamScoutingReport;
