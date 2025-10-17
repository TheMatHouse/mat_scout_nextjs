"use client";

import { useMemo, useState } from "react";

function normalize(s) {
  return (s || "").toLowerCase();
}

function FaqItem({ q, a, tags }) {
  return (
    <details className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-[#1b1c24]">
      <summary className="cursor-pointer text-lg font-semibold text-gray-900 dark:text-gray-100">
        {q}
      </summary>

      {/* Wrapper gives typography; inner div renders raw HTML (lists, etc.) */}
      <div className="mt-3 prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-100">
        {/* IMPORTANT: use a div, not a <p>, to avoid invalid nesting with <ul>/<li> */}
        <div
          className="faq-answer"
          dangerouslySetInnerHTML={{ __html: a }}
        />
        {tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Ensure bullets render even without Tailwind Typography plugin */}
      <style
        jsx
        global
      >{`
        .faq-answer ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0 0 12px;
        }
        .faq-answer ul ul {
          list-style: circle;
          margin: 4px 0 8px;
        }
        .faq-answer li {
          margin: 4px 0;
          line-height: 1.5;
        }
        .faq-answer p {
          margin: 0 0 12px;
          line-height: 1.6;
        }
      `}</style>
    </details>
  );
}

function FaqClient({ initialFaqs }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = normalize(q);
    if (!needle) return initialFaqs;
    return initialFaqs.filter((f) => {
      const hay = `${f.question} ${f.answer} ${(f.tags || []).join(
        " "
      )}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q, initialFaqs]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Frequently Asked Questions
      </h1>

      {/* Search input (case-insensitive) */}
      <div className="mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by keyword (e.g., Team)…"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] px-4 py-3 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
        />
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          Tip: type <span className="font-semibold">team</span> to see
          team-related questions.
        </p>
      </div>

      <div className="space-y-4">
        {filtered.length ? (
          filtered.map((f) => (
            <FaqItem
              key={f._id}
              q={f.question}
              a={f.answer}
              tags={f.tags}
            />
          ))
        ) : (
          <p className="text-gray-800 dark:text-gray-100">
            No matching questions yet.
          </p>
        )}
      </div>
    </main>
  );
}

export default FaqClient;
