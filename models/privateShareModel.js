// models/privateShareModel.js
import mongoose from "mongoose";

const PrivateShareSchema = new mongoose.Schema(
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

    // null when scope === "all"
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    scope: {
      type: String,
      enum: ["one", "all"],
      required: true,
      default: "one",
      index: true,
    },

    sharedWithUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    permission: {
      type: String,
      enum: ["view"],
      default: "view",
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------
   Indexes
   ----------------------------------------------------- */

// ONE report share: (doc + user) must be unique
PrivateShareSchema.index(
  {
    documentType: 1,
    documentId: 1,
    sharedWithUserId: 1,
    scope: 1,
  },
  {
    unique: true,
    partialFilterExpression: { scope: "one" },
  }
);

// ALL reports share: (owner + type + user) must be unique
PrivateShareSchema.index(
  {
    ownerId: 1,
    documentType: 1,
    sharedWithUserId: 1,
    scope: 1,
  },
  {
    unique: true,
    partialFilterExpression: { scope: "all" },
  }
);

const PrivateShare =
  mongoose.models.PrivateShare ||
  mongoose.model("PrivateShare", PrivateShareSchema);

export default PrivateShare;
