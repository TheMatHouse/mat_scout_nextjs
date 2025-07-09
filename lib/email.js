// lib/email.js
import nodemailer from "nodemailer";

// Send email function
export async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"MatScout" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
console.log("EMAIL_USER:", process.env.SMTP_USER);
console.log("EMAIL_PASS:", process.env.SMTP_PASS);
// Base email HTML template
export function baseEmailTemplate({ title, message }) {
  return `
    <div style="font-family: sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 6px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <header style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #2b2d42;">${title}</h2>
        </header>
        <main style="font-size: 16px; color: #333;">
          ${message}
        </main>
        <footer style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 10px; font-size: 14px; color: #888;">
          <p>Thanks,<br/>The MatScout Team</p>
        </footer>
      </div>
    </div>
  `;
}
