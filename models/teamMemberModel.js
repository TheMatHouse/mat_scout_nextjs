// models/teamMemberModel.js
import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
    },

    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    role: {
      type: String,
      enum: ["pending", "member", "manager", "coach"],
      default: "pending",
    },

    // ✅ NEW: how the member joined the team
    joinedVia: {
      type: String,
      enum: ["invite", "request", "social-invite"],
      default: "request",
      index: true,
    },

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

export default mongoose.models.TeamMember ||
  mongoose.model("TeamMember", teamMemberSchema);
