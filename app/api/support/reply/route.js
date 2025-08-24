// app/api/support/reply/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";
import { sendEmail } from "@/lib/email/email";
import striptags from "striptags";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function POST(req) {
  try {
    const { token, body } = await req.json();

    if (!token || !body?.trim?.()) {
      return ok({ ok: false, error: "Missing token or empty message." }, 400);
    }

    await connectDB();

    const thread = await ContactThread.findOne({ replyToToken: token });
    if (!thread) return ok({ ok: false, error: "Thread not found." }, 404);

    const clean = striptags(body).trim();
    if (!clean) return ok({ ok: false, error: "Empty message." }, 400);

    // Append inbound message from user
    const now = new Date();
    thread.messages.push({
      role: "user",
      direction: "inbound",
      body: clean,
      fromName: thread.fromName,
      fromEmail: thread.fromEmail,
      sentAt: now,
    });
    thread.lastMessageAt = now;
    thread.lastDirection = "inbound";
    if (thread.status === "closed") thread.status = "open";
    await thread.save();

    // Notify support via email (optional but helpful)
    try {
      const subject = `New web reply on: ${thread.subject}`;
      const html = `<p><strong>${thread.fromName}</strong> replied via web:</p>
                    <div style="white-space:pre-wrap">${clean}</div>`;
      await sendEmail({
        to: process.env.CONTACT_RECEIVER_EMAIL,
        subject,
        html,
        text: `${thread.fromName} replied via web:\n\n${clean}`,
      });
    } catch (e) {
      // non-blocking
      console.warn("Support notify failed:", e?.message || e);
    }

    return ok({ ok: true });
  } catch (err) {
    console.error("Web reply error:", err?.message || err);
    return ok({ ok: false, error: "Server error" }, 500);
  }
}
