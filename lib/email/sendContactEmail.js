import { sendEmail } from "./email";
import { contactEmailTemplate } from "./templates/contactEmailTemplate";
import striptags from "striptags";

// NEW: persist the contact message
import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";
import crypto from "crypto";

/**
 * Save contact message to DB (as a thread) and send the notification email.
 *
 * NOTE:
 * - Expects a ContactThread model (see contactThreadModel.js).
 * - If you set SUPPORT_REPLY_TO_PLUS=true and SUPPORT_REPLY_DOMAIN,
 *   replies to support+<token>@yourdomain can be captured by a webhook.
 */
export async function sendContactEmail({
  type,
  name,
  email,
  phone,
  message,
  subject, // optional; if omitted we'll generate one
}) {
  const sanitizedMessage = striptags(message || "");
  const fromName = (name || "").trim();
  const fromEmail = (email || "").toLowerCase().trim();
  const subj =
    (subject && subject.trim()) ||
    `[Contact] ${type ? `${type} ` : ""}from ${fromName || fromEmail}`;

  // --- 1) Save (or reuse) a thread in Mongo ---
  await connectDB();

  // Reuse an open thread with same email+subject in last 30 days
  const since = new Date(Date.now() - 30 * 86400000);
  let thread = await ContactThread.findOne({
    fromEmail,
    subject: subj,
    status: "open",
    updatedAt: { $gte: since },
  });

  if (!thread) {
    thread = await ContactThread.create({
      subject: subj,
      fromName: fromName || "Unknown",
      fromEmail,
      status: "open",
      replyToToken: crypto.randomBytes(10).toString("hex"),
      messages: [],
    });
  }

  thread.messages.push({
    role: "user",
    direction: "inbound",
    body: sanitizedMessage,
    fromName,
    fromEmail,
    sentAt: new Date(),
  });
  thread.lastMessageAt = new Date();
  thread.lastDirection = "inbound";
  await thread.save();

  // --- 2) Build the outbound support email (same template you already use) ---
  // If your template accepts subject/replyTo, we pass them; if not, it will ignore.
  const emailData = contactEmailTemplate({
    type,
    name: fromName,
    email: fromEmail,
    phone,
    message: sanitizedMessage,
    subject: subj,
    // Optional: set Reply-To so when you reply from your mailbox the user's reply
    // can be routed back into this thread via inbound webhook.
    replyTo:
      process.env.SUPPORT_REPLY_TO_PLUS === "true"
        ? `support+${thread.replyToToken}@${
            process.env.SUPPORT_REPLY_DOMAIN || "matscout.com"
          }`
        : process.env.SUPPORT_REPLY_TO, // e.g. support@matscout.com
  });

  // --- 3) Send the email just like before ---
  // (We return the same thing your old function returned to avoid breaking callers.)
  return await sendEmail(emailData);
}
