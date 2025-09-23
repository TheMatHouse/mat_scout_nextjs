// models/followModel.js
import mongoose, { Schema } from "mongoose";

const FollowSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // target (exactly one set)
    targetType: { type: String, enum: ["user", "family"], required: true },
    followingUserId: { type: Schema.Types.ObjectId, ref: "User" },
    followingFamilyId: { type: Schema.Types.ObjectId, ref: "FamilyMember" },

    // NEW: per-follow notification prefs (used by settings for "follow only")
    notifyOn: {
      matchReport: { type: Boolean, default: true },
      style: { type: Boolean, default: true },
      profile: { type: Boolean, default: true }, // avatar/bio/displayName
    },
  },
  { timestamps: true }
);

// keep your partial unique indexes
FollowSchema.index(
  { followerId: 1, followingUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { followingUserId: { $type: "objectId" } },
  }
);

FollowSchema.index(
  { followerId: 1, followingFamilyId: 1 },
  {
    unique: true,
    partialFilterExpression: { followingFamilyId: { $type: "objectId" } },
  }
);

export default mongoose.models.Follow || mongoose.model("Follow", FollowSchema);
