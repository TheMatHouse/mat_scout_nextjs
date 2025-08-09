// lib/email/templates/welcomeAndVerifyEmail.js
import { baseEmailTemplate } from "./baseEmailTemplate";

export function buildWelcomeAndVerifyEmail({ verifyUrl, firstName, username }) {
  const displayName = firstName || username || "there";
  const message = `
    <p>Hi ${displayName},</p>
    <p>Welcome to <strong>MatScout</strong>! You're almost ready to go — please verify your email address.</p>
    <p>
      <a href="${verifyUrl}"
         style="display:inline-block;background-color:#1a73e8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
        Verify Email
      </a>
    </p>
    <p style="margin-top:16px;">If the button doesn’t work, copy and paste this link:</p>
    <p style="word-break:break-all;">${verifyUrl}</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
    <p>Need help? Just reply to this email.</p>
  `;
  return baseEmailTemplate({
    title: "Welcome to MatScout",
    message,
    // logoUrl: "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
  });
}
