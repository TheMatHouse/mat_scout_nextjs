"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, text }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && text !== undefined) {
      if (editorRef.current.innerHTML !== text) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

        editorRef.current.innerHTML = text; // Only set if different

        // Restore cursor position after updating content
        if (range) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, [text]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML); // Send updated content to parent
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
    handleInput(); // Ensure updated content is sent to parent
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg">
      {/* Toolbar */}
      <div className="mb-2 flex gap-2 border p-2 text-gray-100 rounded-md shadow-sm">
        <button
          onClick={() => applyStyle("bold")}
          className="px-2 py-1 border rounded"
        >
          Bold
        </button>
        <button
          onClick={() => applyStyle("italic")}
          className="px-2 py-1 border rounded"
        >
          Italic
        </button>
        <button
          onClick={() => applyStyle("underline")}
          className="px-2 py-1 border rounded"
        >
          Underline
        </button>
      </div>

      {/* Editable Content */}
      <div
        contentEditable
        ref={editorRef}
        id={name}
        name={name}
        onInput={handleInput} // Capture text updates
        onKeyDown={handleKeyDown} // Fix Enter behavior
        className="text-gray-900 dark:text-gray-100 rounded-lg shadow-md p-4 min-h-[200px] border border-gray-300 outline-none"
        suppressContentEditableWarning={true}
      />
    </div>
  );
}
