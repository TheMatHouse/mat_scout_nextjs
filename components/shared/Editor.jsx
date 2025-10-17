"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, text, label }) {
  const editorRef = useRef(null);

  // Keep innerHTML in sync with `text` prop without blowing away selection unnecessarily
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

  const emitChange = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => emitChange();

  const handleKeyDown = (e) => {
    // Shift+Enter => soft line break
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      emitChange();
      return;
    }
    // otherwise allow Enter to create paragraphs or list items normally
  };

  const applyCommand = (command, value = null) => {
    // Ensure the editor has focus so execCommand hits the right target
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const toolbarBtn =
    "px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600";

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

        {/* NEW: Unordered List + Indent/Outdent */}
        <button
          type="button"
          onClick={() => applyCommand("insertUnorderedList")}
          className={toolbarBtn}
          title="Bulleted list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => applyCommand("indent")}
          className={toolbarBtn}
          title="Indent"
        >
          Indent
        </button>
        <button
          type="button"
          onClick={() => applyCommand("outdent")}
          className={toolbarBtn}
          title="Outdent"
        >
          Outdent
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
        suppressContentEditableWarning
        className={`editor-content block w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
          shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500
          sm:text-sm p-3 min-h-[150px]`}
      />

      {/* Minimal content styling for consistency */}
      <style
        jsx
        global
      >{`
        /* Paragraph spacing */
        .editor-content p {
          margin: 0 0 12px;
          line-height: 1.5;
        }
        /* Handle browser-inserted divs */
        .editor-content div {
          margin: 0;
          line-height: 1.5;
        }
        /* Lists */
        .editor-content ul {
          list-style: disc;
          padding-left: 1.25rem; /* indent bullets */
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
        /* Show empty lines nicely */
        .editor-content p:empty::before,
        .editor-content div:empty::before {
          content: "\\00a0";
          white-space: pre;
        }
      `}</style>
    </div>
  );
}
