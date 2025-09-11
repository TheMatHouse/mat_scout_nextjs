// models/userStylesModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const PromotionSchema = new Schema(
  {
    rank: { type: String, required: true }, // e.g., "Shodan", "Purple", "Blue"
    promotedOn: { type: Date, required: true }, // date of promotion
    awardedBy: { type: String }, // optional
    note: { type: String }, // optional
    proofUrl: { type: String }, // optional (link to certificate/photo)
  },
  { _id: false }
);

const userStyleSchema = new Schema(
  {
    // You currently store the style as a string name; keeping that as-is.
    styleName: {
      type: String,
      required: true,
    },

    // NEW: start date for the style (e.g., Aug 1988)
    startDate: {
      type: Date,
    },

    // NEW: denormalized latest rank for quick reads
    currentRank: {
      type: String,
    },

    // NEW: full promotion history; last entry defines currentRank
    promotions: {
      type: [PromotionSchema],
      default: [],
    },

    // NEW: denormalized latest promotion date for easy sorting/filtering
    lastPromotedOn: {
      type: Date,
      index: true,
    },

    // Existing fields you already had — kept intact
    weightClass: {
      type: String,
    },
    division: {
      type: String,
    },
    grip: {
      type: String,
    },
    favoriteTechnique: {
      type: String,
    },

    // Ownership
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    familyMemberId: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Optional (uncomment if you want to enforce one record per user/family/styleName):
// userStyleSchema.index({ userId: 1, familyMemberId: 1, styleName: 1 }, { unique: true });

/**
 * Keep currentRank and lastPromotedOn in sync with the latest promotion.
 * If promotions is empty and currentRank is set manually, we leave lastPromotedOn
 * undefined (or you could default to startDate/createdAt if you prefer).
 */
userStyleSchema.pre("save", function (next) {
  if (this.isModified("promotions")) {
    if (Array.isArray(this.promotions) && this.promotions.length > 0) {
      const last = this.promotions[this.promotions.length - 1];
      this.currentRank = last?.rank ?? this.currentRank ?? undefined;
      this.lastPromotedOn =
        last?.promotedOn ?? this.lastPromotedOn ?? undefined;
    } else {
      this.lastPromotedOn = undefined;
    }
  }

  // If currentRank changed but promotions is empty, optionally backfill lastPromotedOn:
  if (
    this.isModified("currentRank") &&
    (!this.promotions || this.promotions.length === 0)
  ) {
    this.lastPromotedOn =
      this.lastPromotedOn ?? this.startDate ?? this.createdAt ?? undefined;
  }

  next();
});

const UserStyle =
  mongoose.models.UserStyle || mongoose.model("UserStyle", userStyleSchema);

export default UserStyle;
