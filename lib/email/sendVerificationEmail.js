// lib/email/sendVerificationEmail.js
import { sendEmail } from "@/lib/email/email";
import { welcomeAndVerifyEmail } from "@/lib/email/templates/welcomeAndVerifyEmail";

export default async function sendVerificationEmail({ to, token }) {
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    throw new Error("❌ Missing NEXT_PUBLIC_BASE_URL in environment");
  }

  const email = welcomeAndVerifyEmail({ to, token });
  return await sendEmail(email);
}
