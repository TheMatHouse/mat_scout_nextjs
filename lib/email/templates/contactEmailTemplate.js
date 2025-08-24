// lib/email/templates/contactEmailTemplate.js
import { baseEmailTemplate } from "./baseEmailTemplate";

/**
 * Build the outbound email for "Contact Us".
 *
 * Accepts optional:
 * - subject: override the default subject line
 * - replyTo: address for replies (e.g. support+<token>@matscout.com)
 *
 * Returns a payload compatible with common mailers (Resend, Nodemailer, etc.).
 * We include both `reply_to` and `replyTo` keys so your sendEmail helper
 * can pass the right one through without extra changes.
 */
export function contactEmailTemplate({
  type,
  name,
  email,
  phone,
  message,
  subject, // optional override
  replyTo, // optional reply-to address
}) {
  const subjectMap = {
    question: "Question",
    feedback: "Feedback",
    suggestion: "Suggestion",
    newStyle: "New Style/Sport Request",
    problem: "Problem Report",
  };

  const label = subjectMap[type] || "General Inquiry";
  const finalSubject = subject?.trim() || `MatScout Contact Form – ${label}`;

  const safeName = name || "Not provided";
  const safeEmail = email || "Not provided";
  const safePhone = phone || "Not provided";
  const safeMessage = message || "No message provided";

  const content = `
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${
      email ? `<a href="mailto:${safeEmail}">${safeEmail}</a>` : safeEmail
    }</p>
    <p><strong>Phone:</strong> ${safePhone}</p>
    <p><strong>Type:</strong> ${label}</p>
    <hr />
    <div><strong>Message:</strong><br/>${safeMessage}</div>
  `;

  // Plain text fallback (helps deliverability and readability in some clients)
  const text = [
    "New Contact Form Submission",
    `Name: ${safeName}`,
    `Email: ${safeEmail}`,
    `Phone: ${safePhone}`,
    `Type: ${label}`,
    "",
    "Message:",
    safeMessage.replace(/<[^>]+>/g, ""), // strip any residual HTML
  ].join("\n");

  return {
    to: process.env.CONTACT_RECEIVER_EMAIL, // e.g. support@matscout.com
    subject: finalSubject,
    html: baseEmailTemplate({
      title: "New Contact Form Submission",
      message: content,
    }),
    text,
    // Include both keys; your sendEmail impl can pass through the right one
    reply_to: replyTo,
    replyTo,
  };
}
