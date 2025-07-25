// lib/email/templates/welcomeAndVerifyEmail.js
import { baseEmailTemplate } from "./baseEmailTemplate";

export function welcomeAndVerifyEmail({ to, token }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("❌ Missing NEXT_PUBLIC_BASE_URL for verification email");
  }

  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  const html = baseEmailTemplate({
    title: "Welcome to MatScout!",
    message: `
      <p>Thanks for signing up!</p>
      <p>Please click the button below to verify your email address:</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${verifyUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: var(--ms-blue, #2563eb);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">
          Verify My Account
        </a>
      </div>
      <p style="margin-top: 20px;">If you didn't create an account, you can safely ignore this email.</p>
    `,
  });

  return {
    to,
    subject: "Welcome to MatScout – Please Verify Your Email",
    html,
  };
}
