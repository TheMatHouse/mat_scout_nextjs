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

    // ✅ Invitee name (now valid for BOTH adults and minors)
    firstName: { type: String },
    lastName: { type: String },

    // 🔒 Used ONLY for minors to enforce uniqueness
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

    // New role field — default to "member" unless specified
    role: {
      type: String,
      enum: ["manager", "coach", "member"],
      default: "member",
    },
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
  // email always normalized
  this.email = normalizeEmail(this.email);

  // normalize names for BOTH adults and minors
  this.firstName = normalizeName(this.firstName);
  this.lastName = normalizeName(this.lastName);

  if (this.isMinor) {
    // minors need lowercase copies for uniqueness
    this.firstNameLower = normalizeNameLower(this.firstName);
    this.lastNameLower = normalizeNameLower(this.lastName);
  } else {
    // adults do NOT participate in name-based uniqueness
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
