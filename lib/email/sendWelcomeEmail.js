import { sendEmail } from "@/lib/email/email";
import { welcomeOAuthEmail } from "@/lib/email/templates/welcomeOAuthEmail";

/**
 * Sends a welcome email for OAuth-based signups (Google or Facebook).
 * @param {Object} options
 * @param {string} options.to - Recipient's email address
 */
export async function sendWelcomeEmail({ to }) {
  try {
    const email = welcomeOAuthEmail({ to });
    await sendEmail(email);
    return { success: true, message: "Welcome email sent successfully" };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, message: "Failed to send welcome email" };
  }
}
