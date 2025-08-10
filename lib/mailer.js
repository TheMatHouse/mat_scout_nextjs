// lib/mailer.js
import { Resend } from "resend";
import { shouldSendAndLogEmail, EmailKinds } from "@/lib/mailPolicy";

let _resend = null;

function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Only throws at send-time, not at import-time
    throw new Error("RESEND_API_KEY is missing");
  }
  _resend = new Resend(key);
  return _resend;
}

function getFromAddress() {
  // Prefer env; fall back to a sane default
  return process.env.EMAIL_FROM || "MatScout <no-reply@matscout.com>";
}

export const Mail = {
  // Re-export kinds so callers can do: Mail.kinds.TEAM_INVITE, etc.
  kinds: EmailKinds,

  /**
   * Sends an email, respecting policy (transactional vs. prefs + 24h dedupe).
   * - Pass either toEmail or toUser (or both). toUser takes precedence for prefs.
   * - For dedupe context, pass relatedUserId and/or teamId when applicable.
   *
   * @param {Object} opts
   * @param {string} opts.type                      - one of Mail.kinds.*
   * @param {Object} [opts.toUser]                  - mongoose user doc or plain object with {email, notificationSettings}
   * @param {string} [opts.toEmail]                 - raw email if user not loaded
   * @param {string} opts.subject
   * @param {string} opts.html
   * @param {string} [opts.from]                    - override From
   * @param {Object} [opts.headers]                 - additional headers for Resend
   * @param {string} [opts.relatedUserId]           - for dedupe (e.g., subject user/family)
   * @param {string} [opts.teamId]                  - for dedupe (e.g., team context)
   */
  async sendEmail({
    type,
    toUser,
    toEmail,
    subject,
    html,
    from,
    headers,
    relatedUserId,
    teamId,
  }) {
    const to = (toUser?.email || toEmail || "").toLowerCase().trim();
    if (!to) {
      return { skipped: true, reason: "missing_recipient" };
    }

    // Check policy (transactional bypasses prefs & dedupe)
    const gate = await shouldSendAndLogEmail({
      type,
      toUser,
      toEmail: to,
      relatedUserId,
      teamId,
    });

    if (!gate.allowed) {
      // Respect user prefs / dedupe quietly
      return { skipped: true, reason: gate.reason || "blocked_by_policy" };
    }

    const resend = getResend();
    const fromAddr = from || getFromAddress();

    const resp = await resend.emails.send({
      from: fromAddr,
      to,
      subject,
      html,
      headers,
    });

    return {
      id: resp?.data?.id || resp?.id,
      transactional: !!gate.transactional,
      status: "sent",
    };
  },
};

export default Mail;
