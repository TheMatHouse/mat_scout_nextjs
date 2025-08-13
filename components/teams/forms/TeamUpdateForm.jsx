// components/teams/forms/TeamUpdateForm.jsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";

const Editor = dynamic(() => import("@/components/shared/Editor"), {
  ssr: false,
  loading: () => (
    <div className="h-32 rounded border bg-white/50 dark:bg-gray-800/50 animate-pulse" />
  ),
});

export default function TeamUpdateForm({
  slug,
  initial = null,
  onSuccess,
  onClose,
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [saving, setSaving] = useState(false);

  // keep state in sync if a different update is opened
  useEffect(() => {
    setTitle(initial?.title || "");
    setBody(initial?.body || "");
  }, [initial]);

  const parseJsonMaybe = async (res) => {
    const text = await res.text();
    try {
      return { data: JSON.parse(text), raw: text };
    } catch {
      return { data: null, raw: text };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    const b = (body ?? "").trim();
    if (!t || !b) {
      toast.error("Please provide a title and message.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!initial?._id;
      const url = isEdit
        ? `/api/teams/${encodeURIComponent(slug)}/updates/${encodeURIComponent(
            initial._id
          )}`
        : `/api/teams/${encodeURIComponent(slug)}/updates`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, body: b }),
      });

      const { data, raw } = await parseJsonMaybe(res);
      if (!res.ok) {
        console.error("Update save failed:", { status: res.status, raw });
        const msg =
          (data && (data.error || data.message)) ||
          `Failed to save (HTTP ${res.status})`;
        toast.error(msg);
        return;
      }

      toast.success(isEdit ? "Update edited." : "Update posted.");
      onSuccess?.(data?.update || null);
      onClose?.();
    } catch (err) {
      console.error("Update save threw:", err);
      toast.error(err.message || "Failed to save update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Title */}
      <label className="block text-sm font-medium">
        Title
        <input
          className="mt-1 w-full rounded border px-3 py-2 bg-white dark:bg-gray-800"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="e.g., Saturday practice moved to 10am"
          required
        />
      </label>

      {/* Body (Rich Editor) */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Message</div>
        <Editor
          text={body ?? ""}
          onChange={setBody}
          name="teamUpdateBody"
          label={null}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-white-sm"
          onClick={() => onClose?.()}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? "Saving…" : initial?._id ? "Save Changes" : "Post Update"}
        </button>
      </div>
    </form>
  );
}
