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
  WELCOME: "welcome",
};

// Transactional emails bypass rate limits
const ALWAYS_TRANSACTIONAL = new Set([
  EmailKinds.VERIFICATION,
  EmailKinds.PASSWORD_RESET,
  EmailKinds.WELCOME,
]);

// 24h rate-limited emails
const RATE_LIMITED = new Set([
  EmailKinds.TEAM_INVITE,
  EmailKinds.JOIN_REQUEST,
  EmailKinds.TEAM_UPDATE,
  EmailKinds.SCOUTING_REPORT,
  EmailKinds.GENERIC_NOTICE,

  // NEW
  EmailKinds.MATCH_REPORT_SHARED,
  EmailKinds.SCOUTING_REPORT_SHARED,
  EmailKinds.PRIVATE_REPORT_INVITE,
]);

function buildDedupeKey({ type, to, relatedUserId, teamId }) {
  const raw = `${type}:${to}:${relatedUserId || "-"}:${teamId || "-"}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function shouldSendAndLogEmail({
  type,
  toUser,
  toEmail,
  relatedUserId,
  teamId,
}) {
  const to = (toEmail || toUser?.email || "").toLowerCase().trim();
  if (!to) return { allowed: false, reason: "missing_recipient" };

  if (ALWAYS_TRANSACTIONAL.has(type)) {
    return { allowed: true, transactional: true };
  }

  if (!RATE_LIMITED.has(type)) {
    return { allowed: true };
  }

  await connectDB();

  const dedupeKey = buildDedupeKey({
    type,
    to,
    relatedUserId,
    teamId,
  });

  try {
    await EmailLog.create({
      to,
      type,
      relatedUserId: relatedUserId || null,
      teamId: teamId || null,
      dedupeKey,
    });

    return { allowed: true };
  } catch (err) {
    if (err?.code === 11000) {
      const last = await EmailLog.findOne({ dedupeKey })
        .sort({ createdAt: -1 })
        .select("createdAt");

      const retryAfter = last
        ? new Date(last.createdAt.getTime() + 24 * 60 * 60 * 1000)
        : null;

      return {
        allowed: false,
        reason: "rate_limited_24h",
        retryAfter,
      };
    }

    throw err;
  }
}
