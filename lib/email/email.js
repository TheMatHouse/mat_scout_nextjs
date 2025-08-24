// lib/email/email.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generic email sender used across the app.
 * Accepts: { to, subject, html, text, reply_to | replyTo, headers, from }
 * Returns: { id } from Resend on success.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  reply_to,
  replyTo,
  headers,
  from,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!to) throw new Error("sendEmail: 'to' is required");
  if (!subject) throw new Error("sendEmail: 'subject' is required");

  const fromAddress =
    from ||
    process.env.SUPPORT_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "no-reply@matscout.com";

  const replyToAddress =
    reply_to || replyTo || process.env.SUPPORT_REPLY_TO || undefined;

  const payload = {
    from: fromAddress,
    to,
    subject,
    html,
    text,
    headers: headers || undefined,
  };

  if (replyToAddress) {
    // Resend expects `reply_to`
    payload.reply_to = replyToAddress;
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    console.error("❌ Resend send error:", error);
    throw new Error(error?.message || "Failed to send email");
  }

  // Resend returns { id: "..." }
  return { id: data?.id || null };
}
