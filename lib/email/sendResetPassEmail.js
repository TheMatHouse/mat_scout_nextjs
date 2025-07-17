import { sendEmail } from "@/lib/email/email";
import { resetPasswordEmail } from "@/lib/email/templates/resetPasswordEmail";

export async function sendResetPasswordEmail({ to, token }) {
  const email = resetPasswordEmail({ to, token });
  return await sendEmail(email);
}
