import { sendEmail } from "./email";
import { contactEmailTemplate } from "./templates/contactEmailTemplate";
import striptags from "striptags";

export async function sendContactEmail({ type, name, email, phone, message }) {
  const sanitizedMessage = striptags(message); // Strip HTML for safety
  const emailData = contactEmailTemplate({
    type,
    name,
    email,
    phone,
    message: sanitizedMessage,
  });
  return await sendEmail(emailData);
}
