// lib/email/templates/contactEmailTemplate.js
import { baseEmailTemplate } from "./baseEmailTemplate";

export function contactEmailTemplate({
  type,
  firstName,
  lastName,
  email,
  phone,
  comments,
}) {
  const subjectMap = {
    question: "Question",
    feedback: "Feedback",
    suggestion: "Suggestion",
    newStyle: "New Style/Sport Request",
    problem: "Problem Report",
  };

  const label = subjectMap[type] || "General Inquiry";

  const message = `
    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
    <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
    <p><strong>Type:</strong> ${label}</p>
    <hr />
    <div><strong>Message:</strong><br/>${comments}</div>
  `;

  return {
    to: process.env.CONTACT_RECEIVER_EMAIL,
    subject: `MatScout Contact Form – ${label}`,
    html: baseEmailTemplate({
      title: "New Contact Form Submission",
      message,
    }),
  };
}
