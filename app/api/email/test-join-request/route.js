import { NextResponse } from "next/server";
import { sendEmail, baseEmailTemplate } from "@/lib/email";

export async function POST(req) {
  const { to, subject, message } = await req.json();
  console.log("TO:", to); // ✅ check this

  const html = baseEmailTemplate({
    title: "Team Join Request",
    message,
  });

  await sendEmail({
    to,
    subject,
    html,
  });

  return NextResponse.json({ message: "Email sent" });
}
