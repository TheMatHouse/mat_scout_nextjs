// lib/email/sendWelcomeEmail.js
import { Mail } from "@/lib/email/mailer";
import { buildWelcomeOAuthEmail } from "@/lib/email/templates/welcomeOAuthEmail";

/**
 * Always-sends welcome email (OAuth signup).
 * Accepts either a user doc (toUser) or raw email (toEmail).
 */
export async function sendWelcomeEmail({ toUser, toEmail } = {}) {
  const html = buildWelcomeOAuthEmail();
  const result = await Mail.sendEmail({
    type: Mail.kinds.WELCOME, // transactional
    toUser,
    toEmail,
    subject: "Welcome to MatScout!",
    html,
  });
  return result;
}
