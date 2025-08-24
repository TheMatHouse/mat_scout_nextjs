// app/api/contact/route.js
import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email/sendContactEmail";

export const dynamic = "force-dynamic";

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
}

export async function POST(req) {
  try {
    const { type, name, email, phone, message, subject } = await req.json();

    // Basic validation
    const errors = [];
    if (!name?.trim()) errors.push("name");
    if (!isEmail(email)) errors.push("email");
    if (!message?.trim()) errors.push("message");

    if (errors.length) {
      return NextResponse.json(
        { ok: false, error: `Missing/invalid: ${errors.join(", ")}` },
        { status: 400 }
      );
    }

    // Persists to DB (ContactThread) AND sends the email
    const result = await sendContactEmail({
      type,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: (phone || "Not provided").trim?.() || "Not provided",
      message,
      subject, // optional
    });

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Email failed to send." },
        { status: 500 }
      );
    }

    // If sendContactEmail returns details (threadId/emailId), include them.
    const payload =
      typeof result === "object" ? { ok: true, ...result } : { ok: true };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("Contact route error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
