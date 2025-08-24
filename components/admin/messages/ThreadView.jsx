"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

function fmt(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function ThreadView({ thread }) {
  const router = useRouter();

  // local state so we avoid hard reloads (toast survives)
  const [messages, setMessages] = useState(thread.messages || []);
  const [status, setStatus] = useState(thread.status);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReply(closeAfterSend = false) {
    if (!reply.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages/${thread._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, closeAfterSend }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Failed to send reply.");
        return;
      }

      // optimistic UI update
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          role: "admin",
          direction: "outbound",
          body: reply,
          fromName: "You",
          fromEmail: "",
          sentAt: now,
        },
      ]);
      setReply("");
      if (closeAfterSend) setStatus("closed");

      toast.success(
        data?.emailId
          ? `Reply sent (${data.emailId}).`
          : closeAfterSend
          ? "Reply sent and thread closed."
          : "Reply sent."
      );

      // refresh server components (no full reload)
      router.refresh();
    } catch (e) {
      toast.error(e?.message || "Failed to send reply.");
    } finally {
      setLoading(false);
    }
  }

  async function setThreadStatus(next) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages/${thread._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Failed to update status.");
        return;
      }

      setStatus(next);
      toast.success(next === "closed" ? "Thread closed." : "Thread reopened.");
      router.refresh();
    } catch (e) {
      toast.error(e?.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Thread header */}
      <div className="rounded border p-4 bg-white dark:bg-gray-900">
        <div className="text-sm text-gray-300">
          From:{" "}
          <span className="font-mono">
            {thread.fromName} &lt;{thread.fromEmail}&gt;
          </span>
        </div>
        <div className="text-sm text-gray-300">
          Status: <span className="capitalize">{status}</span>
        </div>
        <div className="mt-2 flex gap-2">
          {status === "open" ? (
            <button
              onClick={() => setThreadStatus("closed")}
              disabled={loading}
              className="px-3 py-1 rounded border"
            >
              Close
            </button>
          ) : (
            <button
              onClick={() => setThreadStatus("open")}
              disabled={loading}
              className="px-3 py-1 rounded border"
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="rounded border p-4 bg-gray-50/30 dark:bg-gray-900/30 space-y-4">
        {messages?.length ? (
          messages.map((m, i) => (
            <div
              key={i}
              className={[
                "p-3 rounded border",
                m.role === "admin"
                  ? "bg-blue-900/15 border-blue-800"
                  : "bg-gray-900/20 border-gray-700",
              ].join(" ")}
            >
              <div className="text-xs mb-1 text-gray-400">
                {m.role?.toUpperCase?.() || "MSG"} • {fmt(m.sentAt)}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">No messages yet.</div>
        )}
      </div>

      {/* Reply box */}
      <div className="rounded border p-4 bg-white dark:bg-gray-900">
        <label className="block text-sm mb-2">Reply</label>
        <textarea
          className="w-full min-h-[130px] p-3 rounded bg-transparent border"
          placeholder={
            status === "closed"
              ? "Thread is closed — reopen to reply"
              : "Type your reply..."
          }
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          disabled={loading || status === "closed"}
        />
        <div className="flex gap-2 mt-3">
          <button
            disabled={loading || !reply.trim() || status === "closed"}
            onClick={() => sendReply(false)}
            className="px-4 py-2 rounded bg-[var(--ms-light-red)] text-white disabled:opacity-50"
          >
            Send reply
          </button>
          <button
            disabled={loading || !reply.trim() || status === "closed"}
            onClick={() => sendReply(true)}
            className="px-4 py-2 rounded border"
            title="Send reply and close thread"
          >
            Send & close
          </button>
        </div>
      </div>
    </div>
  );
}
