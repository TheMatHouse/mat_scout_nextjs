import EmailLog from "@/models/emailLog";
import { connectDB } from "@/lib/mongo";
import crypto from "crypto";

/* ============================================================
   Email kinds
============================================================ */
export const EmailKinds = {
  VERIFICATION: "verification",
  PASSWORD_RESET: "password_reset",
  TEAM_INVITE: "team_invite",
  JOIN_REQUEST: "join_request",
  TEAM_UPDATE: "team_update",
  SCOUTING_REPORT: "scouting_report",
  GENERIC_NOTICE: "generic_notice",
  WELCOME: "welcome",
};

/* ============================================================
   Transactional emails (always allowed, never throttled)
============================================================ */
const ALWAYS_TRANSACTIONAL = new Set([
  EmailKinds.VERIFICATION,
  EmailKinds.PASSWORD_RESET,
  EmailKinds.WELCOME,
]);

/* ============================================================
   Rate limits (in minutes)
============================================================ */
const RATE_LIMITS_MINUTES = {
  [EmailKinds.TEAM_INVITE]: 5, // ✅ resend allowed after 5 minutes
  [EmailKinds.JOIN_REQUEST]: 60,
  [EmailKinds.TEAM_UPDATE]: 60 * 24,
  [EmailKinds.SCOUTING_REPORT]: 60 * 24,
  [EmailKinds.GENERIC_NOTICE]: 60 * 24,
};

/* ============================================================
   User email preference mapping
============================================================ */
function emailPrefFor(user, type) {
  if (!user?.notificationSettings) return true;

  switch (type) {
    case EmailKinds.JOIN_REQUEST:
      return !!user.notificationSettings.joinRequests?.email;

    case EmailKinds.TEAM_INVITE:
      return !!user.notificationSettings.teamInvites?.email;

    case EmailKinds.TEAM_UPDATE:
      return !!user.notificationSettings.teamUpdates?.email;

    case EmailKinds.SCOUTING_REPORT:
      return !!user.notificationSettings.scoutingReports?.email;

    default:
      return true;
  }
}

/* ============================================================
   Dedupe key (same as before)
============================================================ */
function buildDedupeKey({ type, to, relatedUserId, teamId }) {
  const raw = `${type}:${to}:${relatedUserId || "-"}:${teamId || "-"}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/* ============================================================
   Main policy decision
============================================================ */
export async function shouldSendAndLogEmail({
  type,
  toUser,
  toEmail,
  relatedUserId,
  teamId,
}) {
  const to = (toEmail || toUser?.email || "").toLowerCase().trim();
  if (!to) return { allowed: false, reason: "missing_recipient" };

  // Always allow transactional
  if (ALWAYS_TRANSACTIONAL.has(type)) {
    return { allowed: true, transactional: true };
  }

  // Respect preferences
  if (toUser && !emailPrefFor(toUser, type)) {
    return { allowed: false, reason: "user_pref_opt_out" };
  }

  const cooldownMinutes = RATE_LIMITS_MINUTES[type];
  if (!cooldownMinutes) {
    return { allowed: true, transactional: false };
  }

  await connectDB();

  const dedupeKey = buildDedupeKey({ type, to, relatedUserId, teamId });
  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const recent = await EmailLog.findOne({
    dedupeKey,
    createdAt: { $gte: cutoff },
  }).lean();

  if (recent) {
    return {
      allowed: false,
      reason: `rate_limited_${cooldownMinutes}m`,
    };
  }

  await EmailLog.create({
    to,
    type,
    relatedUserId: relatedUserId || null,
    teamId: teamId || null,
    dedupeKey,
  });

  return { allowed: true, transactional: false };
}
