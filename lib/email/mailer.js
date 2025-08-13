// lib/email/mailer.js
import { Resend } from "resend";
import { shouldSendAndLogEmail, EmailKinds } from "@/lib/mailPolicy";

let _resend = null;

function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is missing");
  _resend = new Resend(key);
  return _resend;
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "MatScout <no-reply@matscout.com>";
}

export const Mail = {
  kinds: EmailKinds,

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
    if (!to) return { skipped: true, reason: "missing_recipient" };

    const gate = await shouldSendAndLogEmail({
      type,
      toUser,
      toEmail: to,
      relatedUserId,
      teamId,
    });
    if (!gate.allowed) {
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

  // ✅ Fixed: directly call Mail.sendEmail to avoid `this` binding issues
  async sendPasswordReset(
    toUser,
    { html, subject, relatedUserId, teamId } = {}
  ) {
    return Mail.sendEmail({
      type: EmailKinds.PASSWORD_RESET,
      toUser,
      subject: subject || "Reset your MatScout password",
      html,
      relatedUserId: relatedUserId || toUser?._id,
      teamId,
    });
  },

  async sendVerifyEmail(toUser, { html, subject, relatedUserId, teamId } = {}) {
    return Mail.sendEmail({
      type: EmailKinds.VERIFY_ACCOUNT,
      toUser,
      subject: subject || "Verify your MatScout account",
      html,
      relatedUserId: relatedUserId || toUser?._id,
      teamId,
    });
  },
};

export default Mail;
