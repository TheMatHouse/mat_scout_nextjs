// /lib/email/templates/welcomeOAuthEmail.js
import { baseEmailTemplate } from "./baseEmailTemplate";

export function buildWelcomeOAuthEmail({ dashboardUrl } = {}) {
  const url =
    dashboardUrl ||
    `${
      process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN
    }/dashboard`;

  const message = `
    <p>Thanks for signing up with your Google or Facebook account. Your profile is ready to go!</p>
    <div style="text-align:center;margin-top:20px;">
      <a href="${url}" style="
        display:inline-block;
        padding:12px 24px;
        background-color:#2563eb;
        color:#ffffff;
        text-decoration:none;
        border-radius:6px;
        font-weight:bold;
      ">
        Go to Dashboard
      </a>
    </div>
    <p style="margin-top:20px;font-size:14px;color:#666;">
      If you didn't sign up, you can safely ignore this message.
    </p>
  `;

  return baseEmailTemplate({
    title: "Welcome to MatScout!",
    message,
    // optional: logoUrl
    // logoUrl: "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
  });
}
