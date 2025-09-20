import mongoose from "mongoose";

const reportForSchema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, required: true },
    athleteType: { type: String, enum: ["user", "family"], required: true },
  },
  { _id: false }
);

const scoutingReportSchema = new mongoose.Schema(
  {
    // WHO/ACCESS
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
    createdByName: { type: String, required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

    // CONTEXT
    matchType: { type: String, required: true },
    // Optional but useful to drive the division list in the form
    style: { type: mongoose.Schema.Types.ObjectId, ref: "styleModel" },

    // TARGET ATHLETE
    athleteFirstName: { type: String, required: true },
    athleteLastName: { type: String, required: true },
    athleteNationalRank: String,
    athleteWorldRank: String,

    // 🔁 NEW: replace plain strings with refs + stable display fields
    division: { type: mongoose.Schema.Types.ObjectId, ref: "division" }, // e.g., "Senior Men"
    weightCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "weightCategory",
    },
    weightLabel: { type: String }, // e.g., "66 kg" or "77"
    weightUnit: { type: String, enum: ["kg", "lb"] },

    // Legacy (optional): keep these if you already have data; safe to remove later
    // divisionLegacy: String,
    // weightCategoryLegacy: String,

    athleteClub: String,
    athleteCountry: String,
    athleteGrip: String,
    athleteAttacks: [String],
    athleteAttackNotes: String,

    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    accessList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ✅ Optional guard to ensure weightLabel matches the selected category and to sync unit
scoutingReportSchema.pre("validate", async function () {
  if (this.weightCategory && this.weightLabel) {
    const cat = await this.model("weightCategory")
      .findById(this.weightCategory)
      .lean();
    if (cat) {
      const ok = (cat.items || []).some((i) => i.label === this.weightLabel);
      if (!ok)
        this.invalidate("weightLabel", "Weight not in selected category");
      this.weightUnit = cat.unit; // auto-sync unit
    }
  }
});

const ScoutingReport =
  mongoose.models.ScoutingReport ||
  mongoose.model("ScoutingReport", scoutingReportSchema);

export default ScoutingReport;
