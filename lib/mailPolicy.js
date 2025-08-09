// lib/mailPolicy.js
import EmailLog from "@/models/emailLog";
import { connectDB } from "@/lib/mongo";
import crypto from "crypto";

export const EmailKinds = {
  VERIFICATION: "verification",
  PASSWORD_RESET: "password_reset",
  TEAM_INVITE: "team_invite",
  JOIN_REQUEST: "join_request",
  TEAM_UPDATE: "team_update",
  SCOUTING_REPORT: "scouting_report",
  GENERIC_NOTICE: "generic_notice",
};

// Which types are rate-limited? (24h)
const RATE_LIMITED = new Set([
  EmailKinds.TEAM_INVITE,
  EmailKinds.JOIN_REQUEST,
  EmailKinds.TEAM_UPDATE,
  EmailKinds.SCOUTING_REPORT,
  EmailKinds.GENERIC_NOTICE,
]);

// Which types ignore user email prefs?
const ALWAYS_TRANSACTIONAL = new Set([
  EmailKinds.VERIFICATION,
  EmailKinds.PASSWORD_RESET,
]);

// Map email type -> path in user.notificationSettings.*
function emailPrefFor(user, type) {
  if (!user?.notificationSettings) return true; // default allow if missing

  switch (type) {
    case EmailKinds.JOIN_REQUEST:
      return !!user.notificationSettings.joinRequests?.email;
    case EmailKinds.TEAM_UPDATE:
      return !!user.notificationSettings.teamUpdates?.email;
    case EmailKinds.SCOUTING_REPORT:
      return !!user.notificationSettings.scoutingReports?.email;
    default:
      return true;
  }
}

function buildDedupeKey({ type, to, relatedUserId, teamId }) {
  const raw = `${type}:${(to || "").toLowerCase().trim()}:${
    relatedUserId || "-"
  }:${teamId || "-"}`;
  // Hash to keep the key short/safe; still unique
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Decide if we should send, and (if rate-limited) record the dedupe log.
 * For transactional (verification, password reset), always returns {allowed:true} and does NOT write a log.
 * For others, checks user prefs and writes a dedupe log (unique by 24h via TTL+unique index).
 */
export async function shouldSendAndLogEmail({
  type,
  toUser, // full user doc
  toEmail, // string (fallback if user not loaded)
  relatedUserId, // optional
  teamId, // optional
}) {
  const to = (toEmail || toUser?.email || "").toLowerCase().trim();
  if (!to) return { allowed: false, reason: "missing_recipient" };

  // Transactional -> always allowed, no dedupe
  if (ALWAYS_TRANSACTIONAL.has(type)) {
    return { allowed: true, transactional: true };
  }

  // Respect user prefs for non-transactional types
  if (toUser && !emailPrefFor(toUser, type)) {
    return { allowed: false, reason: "user_pref_opt_out" };
  }

  // Rate limit via dedupe insert
  if (RATE_LIMITED.has(type)) {
    await connectDB();

    const dedupeKey = buildDedupeKey({ type, to, relatedUserId, teamId });
    try {
      await EmailLog.create({
        to,
        type,
        relatedUserId: relatedUserId || null,
        teamId: teamId || null,
        dedupeKey,
      });
      // Insert succeeded -> allowed
      return { allowed: true, transactional: false };
    } catch (err) {
      if (err?.code === 11000) {
        // Duplicate dedupeKey within 24h
        return { allowed: false, reason: "rate_limited_24h" };
      }
      throw err; // bubble unexpected errors
    }
  }

  // Not transactional and not rate-limited -> allowed
  return { allowed: true, transactional: false };
}
