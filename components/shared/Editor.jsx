"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, text, label }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && text !== undefined) {
      if (editorRef.current.innerHTML !== text) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        editorRef.current.innerHTML = text;

        if (range) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
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
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const br = document.createElement("br");
      range.deleteContents();
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const applyStyle = (command) => {
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
        suppressContentEditableWarning={true}
        className="
          block w-full rounded-md border border-gray-300 dark:border-gray-700 
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 
          shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 
          sm:text-sm p-3 min-h-[150px]
        "
      />
    </div>
  );
}
