// lib/mailer.js
import { Resend } from "resend";
import { shouldSendAndLogEmail, EmailKinds } from "@/lib/mailPolicy";

const resend = new Resend(process.env.RESEND_API_KEY);

export const Mail = {
  kinds: EmailKinds,

  /**
   * Unified send with policy (transactional, prefs, rate-limit)
   */
  async sendEmail({
    type,
    toUser,
    toEmail,
    subject,
    html,
    relatedUserId,
    teamId,
    // text, cc, bcc, replyTo — add if you need
  }) {
    // Decide if allowed + (if needed) write dedupe log
    const decision = await shouldSendAndLogEmail({
      type,
      toUser,
      toEmail,
      relatedUserId,
      teamId,
    });

    if (!decision.allowed) {
      return { sent: false, reason: decision.reason || "blocked_by_policy" };
    }

    const to = (toEmail || toUser?.email || "").toLowerCase().trim();

    if (!to) {
      return { sent: false, reason: "missing_recipient" };
    }

    // Actually send via Resend
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || "MatScout <noreply@matscout.com>",
        to,
        subject,
        html,
      });
      return { sent: true };
    } catch (err) {
      console.error("Resend send error:", err);
      return { sent: false, reason: "provider_error" };
    }
  },
};
