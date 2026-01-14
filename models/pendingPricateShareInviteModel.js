// models/pendingPrivateShareInviteModel.js
import mongoose from "mongoose";

const PendingPrivateShareInviteSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      enum: ["match-report", "personal-scout"],
      index: true,
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Optional cleanup if you ever use TTL indexes:
// PendingPrivateShareInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingPrivateShareInvite =
  mongoose.models.PendingPrivateShareInvite ||
  mongoose.model("PendingPrivateShareInvite", PendingPrivateShareInviteSchema);

export default PendingPrivateShareInvite;
