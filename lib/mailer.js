// lib/mailer.js
import { Resend } from "resend";
import { shouldSendAndLogEmail, EmailKinds } from "./mailPolicy";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  type,
  toUser,
  toEmail,
  subject,
  html,
  relatedUserId,
  teamId,
}) {
  const decision = await shouldSendAndLogEmail({
    type,
    toUser,
    toEmail,
    relatedUserId,
    teamId,
  });

  if (!decision.allowed) {
    return { sent: false, reason: decision.reason };
  }

  const to = (toEmail || toUser?.email).toLowerCase().trim();

  // send via Resend
  await resend.emails.send({
    from: `MatScout <no-reply@matscout.com>`,
    to,
    subject,
    html,
  });

  return { sent: true, transactional: !!decision.transactional };
}

// sugar helpers
export const Mail = {
  kinds: EmailKinds,

  async sendVerification(toUser, { subject, html }) {
    return sendEmail({
      type: EmailKinds.VERIFICATION,
      toUser,
      subject: subject ?? "Verify your MatScout account",
      html,
    });
  },

  async sendPasswordReset(toUser, { subject, html }) {
    return sendEmail({
      type: EmailKinds.PASSWORD_RESET,
      toUser,
      subject: subject ?? "Reset your MatScout password",
      html,
    });
  },

  async sendTeamInvite(toUser, { subject, html, relatedUserId, teamId }) {
    return sendEmail({
      type: EmailKinds.TEAM_INVITE,
      toUser,
      subject,
      html,
      relatedUserId,
      teamId,
    });
  },
  // ...add other helpers as needed
};
