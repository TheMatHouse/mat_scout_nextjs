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
  WELCOME: "welcome", // transactional welcome
};

// Types that always send (ignore prefs + no dedupe logging)
const ALWAYS_TRANSACTIONAL = new Set([
  EmailKinds.VERIFICATION,
  EmailKinds.PASSWORD_RESET,
  EmailKinds.WELCOME,
]);

// Types that are rate-limited (24h via EmailLog)
const RATE_LIMITED = new Set([
  EmailKinds.TEAM_INVITE,
  EmailKinds.JOIN_REQUEST,
  EmailKinds.TEAM_UPDATE,
  EmailKinds.SCOUTING_REPORT,
  EmailKinds.GENERIC_NOTICE,
]);

// Map email type -> user.notificationSettings.*.email
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
      return true; // allow others by default
  }
}

function buildDedupeKey({ type, to, relatedUserId, teamId }) {
  const raw = `${type}:${(to || "").toLowerCase().trim()}:${
    relatedUserId || "-"
  }:${teamId || "-"}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Decide if we should send, and (if rate-limited) record the dedupe log.
 * - Transactional (verification, password reset, welcome): allowed, no log.
 * - Others: respect user prefs; for rate-limited types, write a dedupe log (unique 24h).
 */
export async function shouldSendAndLogEmail({
  type,
  toUser, // Mongoose user doc (preferred)
  toEmail, // string fallback if user not loaded
  relatedUserId, // optional: used in dedupe key
  teamId, // optional: used in dedupe key
}) {
  const to = (toEmail || toUser?.email || "").toLowerCase().trim();
  if (!to) return { allowed: false, reason: "missing_recipient" };

  // Transactional -> always allowed; do NOT log
  if (ALWAYS_TRANSACTIONAL.has(type)) {
    return { allowed: true, transactional: true };
  }

  // Respect user prefs for non-transactional types (when we have the user)
  if (toUser && !emailPrefFor(toUser, type)) {
    return { allowed: false, reason: "user_pref_opt_out" };
  }

  // Apply 24h dedupe for rate-limited types
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
      return { allowed: true, transactional: false };
    } catch (err) {
      if (err?.code === 11000) {
        return { allowed: false, reason: "rate_limited_24h" };
      }
      throw err;
    }
  }

  // Not transactional and not rate-limited -> allowed
  return { allowed: true, transactional: false };
}
