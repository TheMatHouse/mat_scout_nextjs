export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";
import SupportReplyClient from "@/components/public/SupportReplyClient";

function safe(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default async function WebReplyPage({ params }) {
  await connectDB();
  const p = await params; // ✅ App Router
  const token = p?.token;

  const thread = await ContactThread.findOne({ replyToToken: token })
    .select("subject fromName fromEmail messages status updatedAt")
    .lean();

  if (!thread) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Conversation not found</h1>
        <p className="text-gray-600">
          This reply link may be invalid or expired. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="rounded border p-4 bg-white dark:bg-gray-900">
        <h1 className="text-xl font-bold mb-2">{thread.subject}</h1>
        <div className="text-sm text-gray-500">
          With {thread.fromName} &lt;{thread.fromEmail}&gt;
        </div>
        <div className="text-sm text-gray-500">
          Updated: {safe(thread.updatedAt)}
        </div>
        {thread.status === "closed" && (
          <div className="mt-2 text-amber-700 dark:text-amber-300 text-sm">
            This conversation is closed, but you can still send a reply to
            reopen it.
          </div>
        )}
      </div>

      <div className="rounded border p-4 bg-gray-50/30 dark:bg-gray-900/30 space-y-3">
        {thread.messages?.length ? (
          thread.messages.slice(-10).map((m, i) => (
            <div
              key={i}
              className={[
                "p-3 rounded border",
                m.role === "admin"
                  ? "bg-blue-900/10 border-blue-800"
                  : "bg-gray-900/10 border-gray-700",
              ].join(" ")}
            >
              <div className="text-xs mb-1 text-gray-500">
                {m.role.toUpperCase()} • {safe(m.sentAt)}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">No messages yet.</div>
        )}
      </div>

      <SupportReplyClient token={token} />
    </div>
  );
}
