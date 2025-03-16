"use client";

import { useEffect, useRef } from "react";

export default function Editor({ name, onChange, attackNotes }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && attackNotes !== undefined) {
      editorRef.current.innerHTML = attackNotes;
    }
  }, [attackNotes]);

  // const handleInput = () => {
  //   if (onChange) {
  //     onChange(editorRef.current.innerHTML);
  //   }
  // };

  // const handleInput = () => {
  //   console.log("Input detected:", editorRef.current.innerHTML);
  // };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br><br>"); // Insert a proper line break
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-lg">
      {/* Toolbar */}
      <div className="mb-2 flex gap-2 border p-2 text-gray-100 rounded-md shadow-sm">
        <button
          onClick={() => document.execCommand("bold")}
          className="px-2 py-1 border rounded"
        >
          Bold
        </button>
        <button
          onClick={() => document.execCommand("italic")}
          className="px-2 py-1 border rounded"
        >
          Italic
        </button>
        <button
          onClick={() => document.execCommand("underline")}
          className="px-2 py-1 border rounded"
        >
          Underline
        </button>
      </div>

      {/* Editable Content Area */}
      <div
        contentEditable
        ref={editorRef}
        id={name}
        name={name}
        //onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="text-gray-900 dark:text-gray-100 rounded-lg shadow-md p-4 min-h-[200px] border border-gray-300 outline-none"
        suppressContentEditableWarning={true}
      />
    </div>
  );
}
