// app/api/test-email/route.js
import { sendEmail } from "@/lib/email";

export async function POST() {
  try {
    await sendEmail({
      to: "youremail@example.com",
      subject: "Test Email from MatScout",
      html: "<p>This is a test email from your site.</p>",
    });

    return Response.json({ message: "Email sent" });
  } catch (err) {
    console.error("Email error:", err);
    return Response.json({ message: "Failed to send email" }, { status: 500 });
  }
}
