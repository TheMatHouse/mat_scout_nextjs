import { useState } from "react";

const TagsAutocomplete = ({
  label,
  suggestions = [],
  tags = [],
  onAdd,
  onDelete,
}) => {
  const [input, setInput] = useState("");

  const filteredSuggestions = suggestions.filter(
    (item) =>
      item.label.toLowerCase().includes(input.toLowerCase()) &&
      !tags.some((tag) => tag.label === item.label)
  );

  const handleAdd = (label) => {
    if (label && !tags.find((tag) => tag.label === label)) {
      onAdd({ label, value: Date.now() });
      setInput("");
    }
  };

  const handleDelete = (index) => {
    onDelete(index);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span
            key={tag.value}
            className="group bg-ms-blue text-white px-3 py-1 rounded-full text-sm flex items-center transition-colors duration-200 hover:bg-ms-dark-red"
          >
            {tag.label}
            <button
              type="button"
              onClick={() => handleDelete(i)}
              className="ml-2 text-red-400 group-hover:text-white font-bold"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd(input.trim());
          }
        }}
        placeholder="Type technique and press Enter"
        className="w-full border px-3 py-2 rounded text-white bg-zinc-800 border-zinc-600 placeholder-zinc-400"
      />

      {input.length > 1 && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full border border-zinc-600 rounded bg-zinc-900 text-white max-h-40 overflow-auto shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleAdd(suggestion.label)}
              className="px-3 py-2 cursor-pointer hover:bg-ms-blue-gray"
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TagsAutocomplete;
