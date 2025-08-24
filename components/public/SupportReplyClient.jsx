"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function SupportReplyClient({ token }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!body.trim()) {
      toast.error("Please write a message.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        toast.error(data?.error || "Failed to send reply.");
        return;
      }
      toast.success("Reply sent!");
      setBody("");
    } catch (e) {
      toast.error(e?.message || "Failed to send reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border p-4 bg-white dark:bg-gray-900">
      <label className="block text-sm mb-2">Your reply</label>
      <textarea
        className="w-full min-h-[130px] p-3 rounded bg-transparent border"
        placeholder="Type your reply..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={loading}
      />
      <div className="mt-3">
        <button
          onClick={submit}
          disabled={loading || !body.trim()}
          className="px-4 py-2 rounded bg-[var(--ms-light-red)] text-white disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reply"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        This secure link lets you reply without logging in. Do not share this
        URL.
      </p>
    </div>
  );
}
