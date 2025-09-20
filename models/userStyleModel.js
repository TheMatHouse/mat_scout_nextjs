// models/userStyleModel.js
import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    rank: { type: String, required: true, trim: true },
    promotedOn: { type: Date, required: true },
    awardedBy: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    proofUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const UserStyleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // present when this style belongs to a family member profile
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      index: true,
      default: null,
    },

    styleName: { type: String, required: true, trim: true, index: true },

    // promotions-centric
    startDate: { type: Date, default: null },
    currentRank: { type: String, default: "", trim: true }, // shown in StyleCard; auto-filled from promotions if empty
    promotions: { type: [PromotionSchema], default: [] },

    // kept: user-facing preferences
    grip: { type: String, default: "", trim: true },
    favoriteTechnique: { type: String, default: "", trim: true },

    // 🔥 removed legacy fields:
    // division, weightClass, weightCategory, weightUnit, weightItemId, etc.
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Most-recent promotion date (computed)
UserStyleSchema.virtual("lastPromotedOn").get(function () {
  if (!Array.isArray(this.promotions) || this.promotions.length === 0)
    return null;
  const mostRecent = this.promotions.reduce(
    (acc, p) =>
      !acc || (p?.promotedOn && p.promotedOn > acc.promotedOn) ? p : acc,
    null
  );
  return mostRecent ? mostRecent.promotedOn : null;
});

// If currentRank is empty, derive it from most recent promotion
UserStyleSchema.pre("save", function (next) {
  if (
    (!this.currentRank || !String(this.currentRank).trim()) &&
    Array.isArray(this.promotions) &&
    this.promotions.length
  ) {
    const mostRecent = this.promotions.reduce(
      (acc, p) =>
        !acc || (p?.promotedOn && p.promotedOn > acc.promotedOn) ? p : acc,
      null
    );
    if (mostRecent?.rank) this.currentRank = mostRecent.rank;
  }
  next();
});

// Helpful static for later maintenance/migrations
UserStyleSchema.statics.fillCurrentRankFromPromotions = async function (
  ids = []
) {
  const q = ids.length
    ? { _id: { $in: ids } }
    : { $or: [{ currentRank: { $exists: false } }, { currentRank: "" }] };
  const docs = await this.find(q, { promotions: 1 }).lean();
  const ops = [];
  for (const d of docs) {
    const promos = Array.isArray(d.promotions) ? d.promotions : [];
    if (!promos.length) continue;
    const mostRecent = promos.reduce(
      (acc, p) =>
        !acc ||
        (p?.promotedOn && new Date(p.promotedOn) > new Date(acc.promotedOn))
          ? p
          : acc,
      null
    );
    if (mostRecent?.rank) {
      ops.push({
        updateOne: {
          filter: { _id: d._id },
          update: { $set: { currentRank: mostRecent.rank } },
        },
      });
    }
  }
  if (ops.length) await this.bulkWrite(ops);
};

const UserStyle =
  mongoose.models.UserStyle || mongoose.model("UserStyle", UserStyleSchema);
export default UserStyle;
