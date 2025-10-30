// components/.../Editor.jsx
"use client";

import { useEffect, useRef } from "react";

/* =========================
   Caret + Debounce Helpers
   ========================= */

const CARET_ID = "__ms_caret_marker__";

const placeCaretMarker = (rootEl) => {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0).cloneRange();
  const marker = document.createElement("span");
  marker.id = CARET_ID;
  marker.appendChild(document.createTextNode("\uFEFF")); // zero-width no-break space
  range.insertNode(marker);

  const after = document.createRange();
  after.setStartAfter(marker);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
  return marker;
};

const restoreCaretFromMarker = (rootEl) => {
  const marker = rootEl.querySelector(`#${CARET_ID}`);
  if (!marker) return;
  const sel = window.getSelection?.();
  if (!sel) return;

  const range = document.createRange();
  range.setStartAfter(marker);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  marker.remove();
};

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* =========================
   Editor Component (arrow)
   ========================= */

const Editor = ({ name, onChange, text, label }) => {
  const editorRef = useRef(null);
  const isFocusedRef = useRef(false);
  const lastEmittedRef = useRef(null);

  // allowlists
  const ALLOWED = useRef(
    new Set(["P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A"])
  ).current;
  const URL_ATTR = useRef(new Set(["href"])).current;

  /* ---------- Sanitizer ---------- */
  const sanitizeHtml = (dirty = "") => {
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
  };

  /* ---------- Normalizer (handles nbsp, empty blocks, lists) ---------- */
  const normalizeHtml = (raw = "") => {
    if (!raw) return "";
    let html = raw;

    html = html.replace(/\\00a0/gi, ""); // CSS-escaped NBSP
    html = html.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " "); // NBSP → space

    html = html
      .replace(/<p>\s*<\/p>/gi, "<p><br/></p>")
      .replace(/<div>\s*<\/div>/gi, "<p><br/></p>");

    html = html
      .replace(/<p><br\/><\/p>(\s*<(ul|ol)\b)/gi, "$1")
      .replace(/(<\/(ul|ol)>\s*)<p><br\/><\/p>/gi, "$1");

    html = html
      .replace(/(<(ul|ol)[^>]*>)\s+/gi, "$1")
      .replace(/\s+(<\/(ul|ol)>)/gi, "$1")
      .replace(/<(li)>\s*<\/\1>/gi, "<li><br/></li>");

    return html;
  };

  const rewriteHtmlPreservingCaret = (el, nextHtml) => {
    if (!el) return;
    placeCaretMarker(el);
    el.innerHTML = nextHtml;
    restoreCaretFromMarker(el);
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmittedRef.current = html;
    onChange?.(html);
  };

  /* ---------- Lifecycle ---------- */

  // Hydrate from external prop ONLY when not focused
  useEffect(() => {
    if (!editorRef.current) return;
    if (text === undefined) return;
    if (isFocusedRef.current) return;

    const incoming = normalizeHtml(sanitizeHtml(text));
    if (editorRef.current.innerHTML === incoming) return;

    editorRef.current.innerHTML = incoming;
  }, [text]);

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
    document.execCommand("styleWithCSS", false, false);
  }, []);

  // Debounced emit (no rewrite) while typing
  const debouncedEmit = useRef(debounce(emitChange, 300)).current;

  // Full normalize + caret-preserving rewrite
  const runNormalize = () => {
    if (!editorRef.current) return;
    const sanitized = sanitizeHtml(editorRef.current.innerHTML);
    const cleaned = normalizeHtml(sanitized);
    if (cleaned !== editorRef.current.innerHTML) {
      rewriteHtmlPreservingCaret(editorRef.current, cleaned);
    }
    emitChange();
  };

  /* ---------- Handlers ---------- */

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    runNormalize(); // final clean + emit on blur
  };

  const handleInput = () => {
    // smooth typing: do not rewrite DOM here
    debouncedEmit(); // keep parent state roughly in sync without fighting the caret
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      // no immediate rewrite; keep it smooth
      debouncedEmit();
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
        ? normalizeHtml(sanitizeHtml(html))
        : escapeHtml(textPlain).replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, toInsert);
      runNormalize(); // clean immediately after paste
    }
  };

  const applyCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    runNormalize(); // clean after bold/italic/underline or list toggles
  };

  const toolbarBtn =
    "px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600";

  /* ---------- Render ---------- */

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
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className={`editor-content block w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
          shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500
          sm:text-sm p-3 min-h-[150px]`}
      />

      {/* Content styling (no :empty::before here) */}
      <style
        jsx
        global
      >{`
        .editor-content,
        .editor-content * {
          color: inherit !important;
        }
        .editor-content u,
        .editor-content span[style*="underline"],
        .editor-content [style*="text-decoration: underline"] {
          text-decoration: underline !important;
        }
        .editor-content p {
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .editor-content div {
          margin: 0;
          line-height: 1.5;
        }
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
      `}</style>
    </div>
  );
};

export default Editor;

/* Escape text when pasting plain content */
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
