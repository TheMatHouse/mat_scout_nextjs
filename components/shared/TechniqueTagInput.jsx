"use client";

import { useEffect, useRef, useState } from "react";

export default function TechniqueTagInput({
  label,
  name,
  suggestions = [],
  selected = [],
  onAdd,
  onDelete,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredSuggestions =
    inputValue.trim().length === 0
      ? []
      : suggestions.filter(
          (s) =>
            s.label.toLowerCase().includes(inputValue.toLowerCase()) &&
            !selected.some(
              (tag) => tag.label.toLowerCase() === s.label.toLowerCase()
            )
        );

  const handleAdd = (item) => {
    if (!item || !item.label) return;
    const exists = selected.some(
      (tag) => tag.label.toLowerCase() === item.label.toLowerCase()
    );
    if (!exists) {
      onAdd(item);
    }
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAdd({ label: inputValue.trim(), value: selected.length });
      }
    } else if (e.key === "Backspace" && inputValue === "" && selected.length) {
      onDelete(selected.length - 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="mb-4 relative"
      ref={containerRef}
    >
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-200">
          {label}
        </label>
      )}

      {/* Updated Input Container */}
      <div
        className="
          flex flex-wrap items-center gap-2
          border rounded-md px-3 py-2
          bg-[var(--color-card)] text-gray-100
          shadow-sm transition
          focus-within:border-[var(--color-border-focus)]
          focus-within:ring-1 focus-within:ring-[var(--color-border-focus)]
        "
      >
        {selected.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-gray-800 text-gray-100 text-sm rounded-full px-3 py-1"
          >
            {tag.label}
            <button
              type="button"
              onClick={() => onDelete(i)}
              className="ml-1 text-gray-300 hover:text-red-400 focus:outline-none"
            >
              ×
            </button>
          </span>
        ))}

        <input
          type="text"
          name={name}
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          className="
            flex-1 min-w-[140px] py-1 px-2 bg-transparent border-none
            focus:outline-none text-sm text-gray-100 placeholder-gray-400
          "
          placeholder="Type technique and press Enter"
        />
      </div>

      {isFocused &&
        (filteredSuggestions.length > 0 || inputValue.trim() !== "") && (
          <ul
            className="
              absolute z-50 mt-1 w-full
              bg-[var(--color-card)] border border-[var(--color-border)]
              rounded-md shadow text-sm text-gray-100
              max-h-52 overflow-y-auto
            "
          >
            {filteredSuggestions.map((sug, i) => (
              <li
                key={i}
                onMouseDown={() => handleAdd(sug)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-800"
              >
                {sug.label}
              </li>
            ))}
            {filteredSuggestions.length === 0 && inputValue.trim() !== "" && (
              <li
                onMouseDown={() =>
                  handleAdd({
                    label: inputValue.trim(),
                    value: selected.length,
                  })
                }
                className="px-4 py-2 cursor-pointer hover:bg-gray-800"
              >
                Add “{inputValue}”
              </li>
            )}
          </ul>
        )}
    </div>
  );
}
