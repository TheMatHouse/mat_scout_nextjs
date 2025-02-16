"use client";

import { useState, useRef } from "react";

export default function Editor({ name, onChange, opponentAttackNotes }) {
  const [content, setContent] = useState("");
  const editorRef = useRef(null);

  const handleInput = () => {
    const newContent = editorRef.current.innerHTML;
    setContent(newContent);
    if (onChange) {
      onChange(newContent); // Pass updated content to parent
    }
  };

  const applyStyle = (tag, event) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedNode = range.startContainer;
    const parentNode = selectedNode.parentNode;

    // Check if the selected range is inside the tag
    if (parentNode.nodeName.toLowerCase() === tag) {
      // Unwrap the element by replacing it with its child nodes
      const children = Array.from(parentNode.childNodes);
      parentNode.replaceWith(...children);
    } else {
      // Wrap the selected text in the tag
      const wrapper = document.createElement(tag);
      const selectedContent = range.extractContents();
      wrapper.appendChild(selectedContent);
      range.insertNode(wrapper);
    }

    // Update state and notify parent
    setContent(editorRef.current.innerHTML);
    if (onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  console.log("NOTES ", opponentAttackNotes);
  return (
    <div className="max-w-3xl mx-auto p-6  rounded-lg">
      {/* <h2 className="text-2xl font-bold mb-4">Next.js WYSIWYG Editor</h2> */}
      <div className="mb-2 flex gap-2 border p-2  text-gray-100 dark:text-100 rounded-md shadow-sm">
        <button
          onClick={(e) => applyStyle("strong", e)}
          className="px-2 py-1 border rounded"
        >
          Bold
        </button>
        <button
          onClick={(e) => applyStyle("em", e)}
          className="px-2 py-1 border rounded"
        >
          Italic
        </button>
        <button
          onClick={(e) => applyStyle("u", e)}
          className="px-2 py-1 border rounded"
        >
          Underline
        </button>
      </div>
      <div
        contentEditable
        ref={editorRef}
        id={name}
        name={name}
        onInput={handleInput} // Keep this
        className="text-gray-900 dark:text-gray-100 rounded-lg shadow-md p-4 min-h-[200px] border border-gray-300 outline-none"
      />

      {/* <div className="mt-6 p-4 border border-gray-300 bg-white dark:bg-ms-blue rounded-md shadow-sm">
        <h3 className="text-lg font-medium mb-2">Live Preview</h3>
        <div
          className="mt-2 prose"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>*/}
    </div>
  );
}
