// lib/email/sendVerificationEmail.js
import { sendEmail } from "@/lib/email/email";
import { welcomeAndVerifyEmail } from "@/lib/email/templates/welcomeAndVerifyEmail";

export default async function sendVerificationEmail({ to, token }) {
  const email = welcomeAndVerifyEmail({ to, token });
  return await sendEmail(email);
}
