// models/teamInvitationModel.js
import mongoose from "mongoose";

const teamInvitationSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      index: true,
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "coach", "manager"],
      required: true,
    },

    // Adult flow
    email: { type: String, lowercase: true, trim: true },

    // Minor flow
    isMinor: { type: Boolean, default: false },
    parentName: String,
    parentEmail: { type: String, lowercase: true, trim: true },

    inviteeFirstName: String,
    inviteeLastName: String,
    message: String,

    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tracking
    acceptedAt: Date,
    acceptedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
    },
    revokedAt: Date,
  },
  { timestamps: true }
);

// Helpful index for quick “is there an invite already?”
teamInvitationSchema.index({
  teamId: 1,
  email: 1,
  parentEmail: 1,
  role: 1,
  expiresAt: -1,
});

const TeamInvitation =
  mongoose.models.TeamInvitation ||
  mongoose.model("TeamInvitation", teamInvitationSchema);

export default TeamInvitation;
