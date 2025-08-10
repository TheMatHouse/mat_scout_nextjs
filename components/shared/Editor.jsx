"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, text, label }) {
  const editorRef = useRef(null);

  // Keep editor HTML in sync with `text` without losing caret when possible
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

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Shift+Enter => soft line break
      if (e.shiftKey) {
        document.execCommand("insertHTML", false, "<br>");
        handleInput();
        return;
      }

      // Enter => force a real paragraph block
      // Empty <p> shows as a blank line due to CSS below
      document.execCommand("insertHTML", false, "<p><br /></p>");
      handleInput();
    }
  };

  const applyStyle = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    handleInput();
  };

  return (
    <div className="w-full space-y-2">
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-2">
        {["Bold", "Italic", "Underline"].map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => applyStyle(style.toLowerCase())}
            className="px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
          >
            {style}
          </button>
        ))}
      </div>

      {/* Editable Area */}
      <div
        contentEditable
        ref={editorRef}
        id={name}
        name={name}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        className={`editor-content block w-full rounded-md border border-gray-300 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
          shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500
          sm:text-sm p-3 min-h-[150px]`}
      />

      {/* Paragraph spacing + show empty lines */}
      <style
        jsx
        global
      >{`
        .editor-content p,
        .editor-content div {
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .editor-content p:empty::before,
        .editor-content div:empty::before {
          content: "\\00a0";
          white-space: pre;
        }
      `}</style>
    </div>
  );
}
