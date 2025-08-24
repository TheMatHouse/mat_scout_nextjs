// app/api/webhooks/inbound/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function POST(req) {
  try {
    // TODO: verify provider signature if available (recommended)
    const payload = await req.json();
    await connectDB();

    // Resend Inbound-like shape; adapt if your provider differs
    const toList = payload?.to || []; // [{ address, name }]
    const toAddress =
      Array.isArray(toList) && toList.length ? toList[0].address : "";
    const fromAddress = payload?.from?.address || "";
    const fromName = payload?.from?.name || "";
    const subject = payload?.subject || "";
    const text = payload?.text || "";
    const html = payload?.html || "";
    const messageId = payload?.message_id || undefined;
    const headers = payload?.headers || {};

    // 1) Try plus addressing: support+<token>@domain
    const plusMatch = toAddress.match(/support\+([a-z0-9]+)@/i);
    const tokenFromPlus = plusMatch?.[1];

    // 2) Try subject case tag: ... [#a1b2c3d4]
    const subjMatch = (subject || "").match(/\[#([A-Za-z0-9-]{6,})\]/);
    const tokenFromSubject = subjMatch?.[1];

    let thread = null;

    if (tokenFromPlus) {
      thread = await ContactThread.findOne({ replyToToken: tokenFromPlus });
    }

    if (!thread && tokenFromSubject) {
      // match prefix if you only showed first 8 chars in subject
      thread = await ContactThread.findOne({
        replyToToken: new RegExp("^" + tokenFromSubject, "i"),
      });
    }

    // 3) Fallback: match by fromEmail + base subject (strip "Re:")
    if (!thread) {
      const baseSubject = (subject || "").replace(/^Re:\s*/i, "").trim();
      thread = await ContactThread.findOne({
        fromEmail: fromAddress.toLowerCase(),
        subject: baseSubject,
        status: "open",
      });
    }

    if (!thread) {
      return ok({ ok: false, error: "Thread not found" }, 404);
    }

    // Append inbound message
    thread.messages.push({
      role: "user",
      direction: "inbound",
      body: text || html,
      fromName: fromName || thread.fromName,
      fromEmail: fromAddress || thread.fromEmail,
      sentAt: new Date(),
      messageId,
      inReplyTo: headers?.["in-reply-to"],
    });

    // Mark as new inbound
    thread.lastMessageAt = new Date();
    thread.lastDirection = "inbound";
    // Re-open if it was closed
    if (thread.status === "closed") thread.status = "open";

    await thread.save();

    return ok({ ok: true });
  } catch (err) {
    console.error("Inbound webhook error:", err);
    return ok({ ok: false, error: "Server error" }, 500);
  }
}
