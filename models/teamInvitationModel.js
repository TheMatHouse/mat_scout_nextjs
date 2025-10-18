// models/teamInvitationModel.js
import mongoose from "mongoose";

const TeamInvitationSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "team",
      required: true,
      index: true,
    },

    // Always store lowercased/trimmed
    email: { type: String, required: true },

    // Adult vs Minor branch
    isMinor: { type: Boolean, default: false, index: true },

    // Only relevant for minors; we also store normalized copies
    firstName: { type: String },
    lastName: { type: String },
    firstNameLower: { type: String },
    lastNameLower: { type: String },

    // who created it, optional
    invitedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },

    // pending | accepted | declined | revoked
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
      index: true,
    },

    // 🔹 add expiry so UI can render "Expires …" for ALL invites
    expiresAt: { type: Date, index: true },

    // optional notes/payload (token, role, message, etc.)
    payload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// ---------- Normalization ----------
function normalizeEmail(e) {
  return (e || "").trim().toLowerCase();
}
function normalizeName(n) {
  return (n || "").trim();
}
function normalizeNameLower(n) {
  return (n || "").trim().toLowerCase();
}

TeamInvitationSchema.pre("validate", function (next) {
  this.email = normalizeEmail(this.email);
  if (this.isMinor) {
    this.firstName = normalizeName(this.firstName);
    this.lastName = normalizeName(this.lastName);
    this.firstNameLower = normalizeNameLower(this.firstName);
    this.lastNameLower = normalizeNameLower(this.lastName);
  } else {
    // Clear minor fields for adults to keep the model tidy
    this.firstName = undefined;
    this.lastName = undefined;
    this.firstNameLower = undefined;
    this.lastNameLower = undefined;
  }
  next();
});

// ---------- Indexes that encode your rules ----------
// ADULT (isMinor=false): Only one per (teamId, email)
TeamInvitationSchema.index(
  { teamId: 1, email: 1 },
  { unique: true, partialFilterExpression: { isMinor: false } }
);

// MINOR (isMinor=true): Only one per (teamId, email, firstNameLower, lastNameLower)
TeamInvitationSchema.index(
  { teamId: 1, email: 1, firstNameLower: 1, lastNameLower: 1 },
  { unique: true, partialFilterExpression: { isMinor: true } }
);

export default mongoose.models.teamInvitation ||
  mongoose.model("teamInvitation", TeamInvitationSchema);
