// models/emailLog.js
import mongoose from "mongoose";

const EMAIL_TYPES = [
  "verification",
  "password_reset",
  "team_invite",
  "join_request",
  "team_update",
  "scouting_report",
  "generic_notice",
];

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  type: { type: String, required: true, enum: EMAIL_TYPES, index: true },

  // Who/what triggered this email (optional but useful for dedupe)
  relatedUserId: { type: String, default: null, index: true },
  teamId: { type: String, default: null, index: true },

  // For robust dedupe (within 24h) without race conditions:
  // Build a stable key like `${type}:${to}:${relatedUserId||'-'}:${teamId||'-'}`
  // and make it unique; combined with TTL this guarantees one-per-24h.
  dedupeKey: { type: String, index: true, unique: true },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24h
  },
});

// Optional: compound index to speed common queries
emailLogSchema.index({ to: 1, type: 1, createdAt: -1 });

export const EMAIL_TYPES_LIST = EMAIL_TYPES;
export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", emailLogSchema);
