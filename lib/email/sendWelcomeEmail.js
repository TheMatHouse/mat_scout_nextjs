import { sendEmail } from "@/lib/email/email";
import { welcomeOAuthEmail } from "@/lib/email/templates/welcomeOAuthEmail";

export async function sendWelcomeEmail({ to }) {
  const email = welcomeOAuthEmail({ to });
  return await sendEmail(email);
}
