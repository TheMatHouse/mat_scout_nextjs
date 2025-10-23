"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, text, label }) {
  const editorRef = useRef(null);
  const normalizingRef = useRef(false);

  /* ---------------- helpers ---------------- */

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

  function sanitizeHtml(dirty = "") {
    if (!dirty) return "";

    let html = dirty
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?o:p[^>]*>/gi, "")
      .replace(/<\/?(meta|link|title|xml|head|body|html)[^>]*>/gi, "");

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;

    function clean(node) {
      if (!node) return;
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
      Array.from(el.childNodes).forEach(clean);
    }

    Array.from(root.childNodes).forEach((n) => clean(n));

    return root.innerHTML
      .replace(/style="[^"]*"/gi, "")
      .replace(/color\s*:\s*[^;"]+;?/gi, "")
      .replace(/caret-color\s*:\s*[^;"]+;?/gi, "")
      .replace(/border-color\s*:\s*[^;"]+;?/gi, "")
      .trim();
  }

  function emitChange() {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }

  /* ---------------- lifecycle ---------------- */

  useEffect(() => {
    if (!editorRef.current || text === undefined) return;
    if (editorRef.current.innerHTML === text) return;

    const sel = window.getSelection?.();
    const hadRange = sel && sel.rangeCount > 0;
    let range;
    if (hadRange) range = sel.getRangeAt(0);

    editorRef.current.innerHTML = text;

    if (hadRange && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [text]);

  // Normalize content after every input/paste
  const normalizeNow = () => {
    if (!editorRef.current || normalizingRef.current) return;
    const cleaned = sanitizeHtml(editorRef.current.innerHTML);
    if (cleaned !== editorRef.current.innerHTML) {
      normalizingRef.current = true;
      editorRef.current.innerHTML = cleaned;
      setTimeout(() => {
        normalizingRef.current = false;
        emitChange();
      }, 0);
    } else {
      emitChange();
    }
  };

  useEffect(() => {
    // Ensure paragraphs instead of divs, and prevent inline style formatting
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, false);
  }, []);

  /* ---------------- handlers ---------------- */

  const handleInput = () => normalizeNow();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      normalizeNow();
      return;
    }
  };

  const handlePaste = (e) => {
    if (!editorRef.current) return;
    const cd = e.clipboardData;
    if (!cd) return;
    const html = cd.getData("text/html");
    const textPlain = cd.getData("text/plain");

    if (html || textPlain) {
      e.preventDefault();
      const toInsert = html
        ? sanitizeHtml(html)
        : escapeHtml(textPlain).replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, toInsert);
      normalizeNow();
    }
  };

  const applyCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    normalizeNow();
  };

  const toolbarBtn =
    "px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600";

  /* ---------------- render ---------------- */

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2">
        {["Bold", "Italic", "Underline"].map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => applyCommand(style.toLowerCase())}
            className={toolbarBtn}
          >
            {style}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyCommand("insertUnorderedList")}
          className={toolbarBtn}
          title="Bulleted list"
        >
          • List
        </button>
      </div>

      {/* Editor */}
      <div
        contentEditable
        ref={editorRef}
        id={name}
        name={name}
        role="textbox"
        aria-multiline="true"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className={`editor-content block w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
          shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500
          sm:text-sm p-3 min-h-[150px]`}
      />

      {/* Content styling & underline fix */}
      <style
        jsx
        global
      >{`
        .editor-content,
        .editor-content * {
          color: inherit !important;
        }
        /* Ensure underlines always visible */
        .editor-content u,
        .editor-content span[style*="underline"],
        .editor-content [style*="text-decoration: underline"] {
          text-decoration: underline !important;
        }
        /* Paragraph spacing */
        .editor-content p {
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .editor-content div {
          margin: 0;
          line-height: 1.5;
        }
        /* Lists */
        .editor-content ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0 0 12px;
        }
        .editor-content ul ul {
          list-style: circle;
          margin: 4px 0 8px;
        }
        .editor-content li {
          margin: 4px 0;
          line-height: 1.5;
        }
        /* Empty line display */
        .editor-content p:empty::before,
        .editor-content div:empty::before {
          content: "\\00a0";
          white-space: pre;
        }
      `}</style>
    </div>
  );
}

/* Escape text when pasting plain content */
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
