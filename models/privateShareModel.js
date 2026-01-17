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

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    scope: {
      type: String,
      enum: ["one", "all"],
      required: true,
      index: true,
    },

    /* WHO this is shared WITH */
    sharedWith: {
      athleteType: {
        type: String,
        enum: ["user", "family"],
        required: true,
        index: true,
      },
      athleteId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    },

    permission: {
      type: String,
      enum: ["view"],
      default: "view",
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* One-report share */
PrivateShareSchema.index(
  {
    documentType: 1,
    documentId: 1,
    "sharedWith.athleteType": 1,
    "sharedWith.athleteId": 1,
    scope: 1,
  },
  {
    unique: true,
    partialFilterExpression: { scope: "one" },
  }
);

/* All-reports share */
PrivateShareSchema.index(
  {
    ownerId: 1,
    documentType: 1,
    "sharedWith.athleteType": 1,
    "sharedWith.athleteId": 1,
    scope: 1,
  },
  {
    unique: true,
    partialFilterExpression: { scope: "all" },
  }
);

export default mongoose.models.PrivateShare ||
  mongoose.model("PrivateShare", PrivateShareSchema);
