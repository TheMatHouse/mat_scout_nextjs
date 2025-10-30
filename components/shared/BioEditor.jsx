// components/profile/BioEditor.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";

/* ---------------- helpers ---------------- */

// Convert HTML to plain text for character counting
function htmlToText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Safe sanitizer for saved bios — strips junk but preserves valid formatting
function sanitizeForBio(dirtyHtml = "") {
  if (!dirtyHtml) return "";

  let html = dirtyHtml
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(/<\/?(meta|link|title|xml|head|body|html)[^>]*>/gi, "");

  if (typeof DOMParser === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root =
    doc.body && doc.body.firstElementChild ? doc.body.firstElementChild : null;
  if (!root) return html;

  const ALLOWED = new Set([
    "P",
    "BR",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "UL",
    "OL",
    "LI",
    "A",
  ]);
  const URL_ATTR = new Set(["href"]);

  function cleanNode(node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) return;

    const el = node;
    const tag = el.tagName;

    if (tag && !ALLOWED.has(tag)) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    const toRemove = [];
    for (const attr of el.attributes || []) {
      const name = attr.name.toLowerCase();
      if (tag === "A" && URL_ATTR.has(name)) {
        const val = (attr.value || "").trim();
        if (/^javascript:/i.test(val)) {
          toRemove.push(name);
        } else {
          el.setAttribute("rel", "nofollow noopener");
          if (!el.getAttribute("target")) el.setAttribute("target", "_blank");
        }
      } else {
        toRemove.push(name);
      }
    }
    toRemove.forEach((n) => el.removeAttribute(n));
    Array.from(el.childNodes).forEach((c) => cleanNode(c));
  }

  Array.from(root.childNodes).forEach((n) => cleanNode(n));

  const cleaned = root.innerHTML
    .replace(/style="[^"]*"/gi, "")
    .replace(/color\s*:\s*[^;"]+;?/gi, "")
    .replace(/caret-color\s*:\s*[^;"]+;?/gi, "")
    .replace(/border-color\s*:\s*[^;"]+;?/gi, "")
    .trim();

  return cleaned || html;
}

/* -------------- component -------------- */

const MAX = 2000;

const BioEditor = ({
  initialHtml = "",
  onSave,
  saving = false,
  className = "",
  label = null,
  helperText = "Add a short bio (up to 2000 characters). It will appear on your public profile.",
}) => {
  const [html, setHtml] = useState(initialHtml || "");
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const lastAppliedRef = useRef(initialHtml || "");

  // Keep editor in sync when parent updates initialHtml (but ignore no-op repeats)
  useEffect(() => {
    const incoming = initialHtml || "";
    if (incoming !== lastAppliedRef.current) {
      lastAppliedRef.current = incoming;
      setHtml(incoming);
    }
  }, [initialHtml]);

  const plain = useMemo(() => htmlToText(html), [html]);
  const overLimit = plain.length > MAX;

  const handleSave = async () => {
    setLocalError("");
    if (overLimit) {
      setLocalError("Bio exceeds 2000 characters.");
      return;
    }
    if (!onSave) return;

    setIsSaving(true);
    try {
      // Final cleanup pass on save
      const cleaned = sanitizeForBio(html);
      const cleanedPlain = htmlToText(cleaned);
      await onSave(cleaned, cleanedPlain);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      className={`rounded-xl border border-border bg-white dark:bg-gray-900 shadow p-6 ${className}`}
    >
      {label && (
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {label}
        </h2>
      )}

      {helperText && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          {helperText}
        </p>
      )}

      {/* Shared Editor (now caret-safe) */}
      <Editor
        name="bio"
        text={html}
        onChange={setHtml}
        label={null}
      />

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`text-xs ${
            overLimit ? "text-red-600" : "text-gray-700 dark:text-gray-300"
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
};

export default BioEditor;
