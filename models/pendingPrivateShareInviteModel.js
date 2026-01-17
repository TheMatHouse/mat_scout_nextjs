import mongoose from "mongoose";

const PendingPrivateShareInviteSchema = new mongoose.Schema(
  {
    /* WHO owns the documents */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* WHAT type of document is being shared */
    documentType: {
      type: String,
      required: true,
      index: true,
      // Intentionally NOT enum-locked so future types
      // (team-scout, encrypted, etc.) do not require migrations
    },

    /* HOW MUCH is being shared */
    scope: {
      type: String,
      enum: ["one", "all"],
      required: true,
      index: true,
    },

    /* WHICH document (only when scope === "one") */
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    /* WHO can claim this invite */
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    /* Secure token in invite link */
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* Expiration */
    expiresAt: {
      type: Date,
      required: true,
    },

    /* Acceptance audit */
    acceptedAt: {
      type: Date,
      default: null,
      index: true,
    },

    acceptedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

/* ---------------- validation ---------------- */

// Enforce the same rule as PrivateShare
PendingPrivateShareInviteSchema.pre("validate", function (next) {
  if (this.scope === "one" && !this.documentId) {
    return next(new Error("documentId is required when scope is 'one'"));
  }

  if (this.scope === "all") {
    this.documentId = null;
  }

  next();
});

/* ---------------- indexes ---------------- */

// Fast cleanup of expired invites (optional but recommended)
PendingPrivateShareInviteSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.models.PendingPrivateShareInvite ||
  mongoose.model("PendingPrivateShareInvite", PendingPrivateShareInviteSchema);
