import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) throw error;
}

export async function sendVerificationEmail(to, verifyUrl) {
  const subject = "Verify your MatScout email";
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5">
      <h2>Confirm your email</h2>
      <p>Click the button below to verify your account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Verify Email</a></p>
      <p>Or copy and paste this link:<br>${verifyUrl}</p>
    </div>`;
  await sendEmail({ to, subject, html });
}
