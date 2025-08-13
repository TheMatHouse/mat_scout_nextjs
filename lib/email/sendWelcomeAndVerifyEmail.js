// lib/email/sendWelcomeAndVerifyEmail.js
import { Mail } from "@/lib/email/mailer";
import { buildWelcomeAndVerifyEmail } from "@/lib/email/templates/welcomeAndVerifyEmail";

/**
 * Always-sends a combined Welcome + Verify email.
 * Expects a user doc and a fully-formed verify URL.
 */
export async function sendWelcomeAndVerifyEmail({ toUser, verifyUrl }) {
  const html = buildWelcomeAndVerifyEmail({
    verifyUrl,
    firstName: toUser?.firstName,
    username: toUser?.username,
  });

  return Mail.sendEmail({
    type: Mail.kinds.WELCOME, // transactional
    toUser,
    subject: "Welcome to MatScout — Verify your email",
    html,
  });
}
