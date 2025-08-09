// /lib/emails/passwordReset.js
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

/**
 * Build the HTML for a password reset email.
 *
 * Usage:
 *   const html = buildPasswordResetEmail({ token });
 *   // or provide your own URL:
 *   const html = buildPasswordResetEmail({ resetUrl: "https://.../reset-password?token=..." });
 */
export function buildPasswordResetEmail({
  token,
  resetUrl,
  expiresInMinutes = 30,
} = {}) {
  const url =
    resetUrl ||
    `${
      process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL
    }/reset-password?token=${encodeURIComponent(token || "")}`;

  const message = `
    <p>We received a request to reset your MatScout password.</p>
    <p>This link will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>
      <a href="${url}"
         style="display:inline-block;background-color:#1a73e8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
        Reset Password
      </a>
    </p>
    <p style="margin-top:12px;">If the button doesn’t work, copy and paste this link:</p>
    <p style="word-break:break-all;">${url}</p>
    <p style="margin-top:16px;color:#666;font-size:14px;">
      If you didn’t request a password reset, you can safely ignore this email.
    </p>
  `;

  return baseEmailTemplate({
    title: "Reset your MatScout password",
    message,
    // Optional: add your logo if you want consistent branding
    // logoUrl: "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
  });
}

/** Optional helper if you want a centralized subject string */
export function passwordResetSubject() {
  return "Reset your MatScout password";
}
