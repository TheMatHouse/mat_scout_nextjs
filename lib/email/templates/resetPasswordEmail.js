import { baseEmailTemplate } from "./baseEmailTemplate";

export function resetPasswordEmail({ to, token }) {
  const resetUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/reset-password?token=${token}`;

  const message = `
    <p>We received a request to reset your password. Click the button below to choose a new one:</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #1f2937; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
        Reset Password
      </a>
    </div>

    <p>If you didn’t request this, you can safely ignore this email.</p>
    <p style="font-size: 0.9em; color: #6b7280;">This link will expire in 30 minutes.</p>
  `;

  return {
    to,
    subject: "Reset Your Password",
    html: baseEmailTemplate({
      title: "Password Reset Request",
      message,
    }),
  };
}
