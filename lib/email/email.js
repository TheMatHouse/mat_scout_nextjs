import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport(
    {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    {
      logger: true,
      debug: true,
    }
  );

  const mailOptions = {
    from: `"MatScout" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const TIMEOUT_MS = 3000;

    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email send timeout")), TIMEOUT_MS)
      ),
    ]);

    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error.message || error);
    // Continue without blocking the API route
    return null;
  }
}
