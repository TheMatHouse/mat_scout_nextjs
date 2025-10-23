// components/shared/BioEditor.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@/components/shared/Editor";
import { Button } from "@/components/ui/button";

/* ---------------- helpers ---------------- */

// Convert any HTML to plain text for UI character counting
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

// Strip dangerous/annoying inline junk and allow only a tiny tag set.
// Allowed tags: p, br, b, strong, i, em, ul, ol, li, a[href]
// Removes all inline styles/classes/ids and Word "mso-" cruft.
// IMPORTANT: This preserves bullet lists and basic formatting.
function sanitizeForBio(dirtyHtml = "") {
  if (!dirtyHtml) return "";

  // Quick kill: remove comments & Word conditionals/mso tags
  let html = dirtyHtml
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "");

  // Also remove meta/office tags if pasted
  html = html.replace(/<\/?(meta|link|title|xml|head|body|html)[^>]*>/gi, "");

  // Parse and walk DOM safely
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  const ALLOWED = new Set([
    "P",
    "BR",
    "B",
    "STRONG",
    "I",
    "EM",
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

    // If tag not allowed, unwrap it (keep children text/inline)
    if (tag && !ALLOWED.has(tag)) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    // Drop all attributes except href on <a> (and sanitize href)
    const toRemove = [];
    for (const attr of el.attributes || []) {
      const name = attr.name.toLowerCase();
      if (tag === "A" && URL_ATTR.has(name)) {
        const val = (attr.value || "").trim();
        if (/^javascript:/i.test(val)) {
          toRemove.push(name);
        } else {
          // safety: add rel/target if not present
          el.setAttribute("rel", "nofollow noopener");
          if (!el.getAttribute("target")) el.setAttribute("target", "_blank");
        }
      } else {
        toRemove.push(name);
      }
    }
    toRemove.forEach((n) => el.removeAttribute(n));

    // Recurse
    const children = Array.from(el.childNodes);
    children.forEach((c) => cleanNode(c));
  }

  Array.from(root.childNodes).forEach((n) => cleanNode(n));

  // Serialize back to string and nuke any lingering style snippets
  return root.innerHTML
    .replace(/style="[^"]*"/gi, "")
    .replace(/color\s*:\s*[^;"]+;?/gi, "")
    .replace(/caret-color\s*:\s*[^;"]+;?/gi, "")
    .replace(/border-color\s*:\s*[^;"]+;?/gi, "")
    .trim();
}

/* -------------- component -------------- */

const MAX = 2000;

export default function BioEditor({
  initialHtml = "",
  onSave, // async (html, plainText) => void — parent shows toasts
  saving = false,
  className = "",
  label = null,
  helperText = "Add a short bio (up to 2000 characters). It will appear on your public profile.",
}) {
  const [html, setHtml] = useState(initialHtml || "");
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const normalizingRef = useRef(false);

  // keep editor in sync when parent updates initialHtml
  useEffect(() => {
    setHtml(initialHtml || "");
  }, [initialHtml]);

  // Auto-sanitize on every change (including paste) without destroying lists/bold/etc.
  // We guard against loops by short-circuiting when sanitized === current.
  useEffect(() => {
    if (normalizingRef.current) return;
    const cleaned = sanitizeForBio(html);
    if (cleaned !== html) {
      normalizingRef.current = true;
      setHtml(cleaned);
      // allow React state flush before re-enabling
      const t = setTimeout(() => {
        normalizingRef.current = false;
      }, 0);
      return () => clearTimeout(t);
    }
  }, [html]);

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
      // Final safety gate: sanitize again before persisting
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
