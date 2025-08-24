// app/api/admin/messages/[id]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";
import { getCurrentUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function nl2br(s) {
  return escapeHtml(s).replace(/\r\n|\n/g, "<br/>");
}
function withCaseTag(subj, token) {
  if (!token) return subj;
  const tag = `[#${token.slice(0, 8)}]`;
  return subj.includes(tag) ? subj : `${subj} ${tag}`;
}
function buildQuotedHistory(thread, maxMessages = 20) {
  const msgs = (thread?.messages || []).slice(-maxMessages);
  let html = "";
  let text = "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const when = new Date(m.sentAt || Date.now()).toLocaleString();
    const fromName = m.fromName || (m.role === "admin" ? "Admin" : "User");
    const fromEmail = m.fromEmail || "";
    const headerHtml = `On ${escapeHtml(when)}, ${escapeHtml(
      fromName
    )} &lt;${escapeHtml(fromEmail)}&gt; wrote:`;
    const headerText = `On ${when}, ${fromName} <${fromEmail}> wrote:`;

    html += `
      <p style="margin:1em 0 0">${headerHtml}</p>
      <blockquote style="margin:0 0 0 1em;border-left:2px solid #e5e7eb;padding-left:.8em">
        ${nl2br(m.body || "")}
      </blockquote>
    `;

    const quoted = String(m.body || "")
      .split(/\r?\n/)
      .map((l) => `> ${l}`)
      .join("\n");
    text += `${headerText}\n${quoted}\n\n`;
  }
  return { html, text };
}

export async function GET(_req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    await connectDB();

    const p = await params; // ✅ avoid sync dynamic APIs error
    const id = p?.id;

    const thread = await ContactThread.findById(id).lean();
    if (!thread) return ok({ error: "Not found" }, 404);

    return ok({ thread });
  } catch (err) {
    console.error("GET thread error:", err);
    return ok({ error: "Server error" }, 500);
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    await connectDB();

    const p = await params; // ✅
    const id = p?.id;

    const { body, closeAfterSend } = await req.json();
    if (!body?.trim?.()) return ok({ error: "Empty reply" }, 400);

    const thread = await ContactThread.findById(id);
    if (!thread) return ok({ error: "Not found" }, 404);

    // Subject + case tag
    let subject = thread.subject?.startsWith("Re:")
      ? thread.subject
      : `Re: ${thread.subject}`;
    subject = withCaseTag(subject, thread.replyToToken);

    // Build a public web-reply link (no login required, tokenized)
    const publicBase =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || "https://matscout.com";
    const webReplyUrl = `${publicBase}/support/r/${thread.replyToToken}`;

    // Reply-To (plus-address when enabled; otherwise plain support@)
    const replyTo =
      process.env.SUPPORT_REPLY_TO_PLUS === "true"
        ? `support+${thread.replyToToken}@${
            process.env.SUPPORT_REPLY_DOMAIN || "matscout.com"
          }`
        : process.env.SUPPORT_REPLY_TO || "support@matscout.com";

    // Quoted history
    const { html: historyHtml, text: historyText } = buildQuotedHistory(
      thread,
      20
    );

    const topHtml = `
      <p>${nl2br(body)}</p>
      <p style="font-size:12px;color:#6b7280;margin-top:12px">
        Reply to this email to continue the conversation,
        or <a href="${escapeHtml(webReplyUrl)}">reply securely on the web</a>.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      ${historyHtml}
    `;
    const topText = `${body}

Reply to this email to continue the conversation,
or reply securely on the web: ${webReplyUrl}

----- Reply above this line -----

${historyText}`;

    // Threading headers if we have a previous provider id
    const lastWithId = [...(thread.messages || [])]
      .reverse()
      .find((m) => m.messageId);
    const headers = lastWithId
      ? {
          "In-Reply-To": `<${lastWithId.messageId}>`,
          References: `<${lastWithId.messageId}>`,
        }
      : undefined;

    // Wrap + send
    const html = baseEmailTemplate({ title: subject, message: topHtml });
    const emailRes = await sendEmail({
      to: thread.fromEmail,
      subject,
      html,
      text: topText,
      reply_to: replyTo,
      headers,
    });

    // Persist outbound message
    const adminName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Admin";
    thread.messages.push({
      role: "admin",
      direction: "outbound",
      body,
      fromName: adminName,
      fromEmail: process.env.SUPPORT_FROM_EMAIL || "support@matscout.com",
      messageId: emailRes?.id || undefined,
      sentAt: new Date(),
    });

    thread.lastMessageAt = new Date();
    thread.lastDirection = "outbound";
    if (closeAfterSend) thread.status = "closed";
    await thread.save();

    return ok({ ok: true, emailId: emailRes?.id || null });
  } catch (err) {
    console.error("PATCH thread reply error:", err);
    return ok({ error: "Server error" }, 500);
  }
}
