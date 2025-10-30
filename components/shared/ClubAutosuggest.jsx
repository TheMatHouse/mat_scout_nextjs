"use client";

import { useEffect, useState, useRef } from "react";

const ClubAutosuggest = ({
  value = "",
  onChange,
  minChars = 2,
  placeholder = "Opponent club name",
}) => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    if (!value || value.length < minChars) {
      setItems([]);
      setOpen(false);
      return;
    }

    let abort = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/clubs/search?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (abort) return;

        const clubs = Array.isArray(data?.clubs) ? data.clubs : [];
        setItems(clubs);
        setOpen(clubs.length > 0);
      } catch (err) {
        if (!abort) setOpen(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, [value, minChars]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const choose = (v) => {
    onChange?.(v);
    setOpen(false);
  };

  const handleKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && hi >= 0 && hi < items.length) {
      e.preventDefault();
      choose(items[hi]);
    }
  };

  return (
    <div
      className="relative"
      ref={ref}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="px-3 py-2 h-10 rounded border bg-transparent w-full"
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <ul className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md mt-1 w-full max-h-48 overflow-auto shadow-lg">
          {items.map((c, i) => (
            <li
              key={c}
              onClick={() => choose(c)}
              onMouseEnter={() => setHi(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === hi ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClubAutosuggest;
