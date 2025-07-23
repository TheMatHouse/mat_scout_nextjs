import { baseEmailTemplate } from "./baseEmailTemplate";

export function welcomeOAuthEmail({ to }) {
  const dashboardUrl = `${
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN
  }/dashboard`;

  const html = baseEmailTemplate({
    title: "Welcome to MatScout!",
    message: `
      <p>Thanks for signing up with your Google or Facebook account. Your profile is ready to go!</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${dashboardUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: var(--ms-blue, #2563eb);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        ">
          Go to Dashboard
        </a>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        If you didn't sign up, you can safely ignore this message.
      </p>
    `,
  });

  return {
    to,
    subject: "Welcome to MatScout!",
    html,
  };
}
