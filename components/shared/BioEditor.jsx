// components/shared/BioEditor.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";

// Convert HTML to plain text for character counting (UI-only)
function htmlToText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX = 1000;

export default function BioEditor({
  initialHtml = "",
  onSave, // async (html, plainText) => void — parent shows toasts
  saving = false,
  className = "",
  label = null,
  helperText = "Add a short bio (up to 1000 characters). It will appear on your public profile.",
}) {
  const [html, setHtml] = useState(initialHtml || "");
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  // keep editor in sync when parent updates initialHtml
  useEffect(() => {
    setHtml(initialHtml || "");
  }, [initialHtml]);

  const plain = useMemo(() => htmlToText(html), [html]);
  const overLimit = plain.length > MAX;

  const handleSave = async () => {
    setLocalError("");
    if (overLimit) {
      setLocalError("Bio exceeds 1000 characters.");
      return;
    }
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(html, plain);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className={`rounded-xl border border-border bg-white dark:bg-gray-900 shadow p-6 ${className}`}
    >
      {label && (
        <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
          {label}
        </h2>
      )}

      {helperText && (
        <p className="text-sm text-muted-foreground mb-4">{helperText}</p>
      )}

      <Editor
        name="bio"
        text={html}
        onChange={setHtml}
        label={null}
      />

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`text-xs ${
            overLimit ? "text-red-600" : "text-muted-foreground"
          }`}
        >
          {plain.length}/{MAX}
        </span>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || isSaving || overLimit}
          className="min-w-[96px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving || isSaving ? "Saving…" : "Save"}
        </Button>
      </div>

      {localError && <p className="mt-2 text-xs text-red-600">{localError}</p>}
    </section>
  );
}
