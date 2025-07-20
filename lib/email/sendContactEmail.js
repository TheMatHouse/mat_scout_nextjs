// lib/email/sendContactEmail.js
import { sendEmail } from "./email";
import { contactEmailTemplate } from "./templates/contactEmailTemplate";
import striptags from "striptags";

export async function sendContactEmail({
  type,
  firstName,
  lastName,
  email,
  phone,
  comments,
}) {
  const sanitizedComments = striptags(comments); // Strip all HTML
  const emailData = contactEmailTemplate({
    type,
    firstName,
    lastName,
    email,
    phone,
    comments: sanitizedComments,
  });
  return await sendEmail(emailData);
}
