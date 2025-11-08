"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@/components/shared/Editor"; // ← your WYSIWYG editor

export default function AdminFaqsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    _id: null,
    question: "",
    answer: "",
    tags: "",
    isPublished: true,
    order: 0,
  });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/faqs?all=1&q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setRows(data.faqs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      `${r.question} ${r.answer} ${(r.tags || []).join(" ")}`
        .toLowerCase()
        .includes(needle)
    );
  }, [q, rows]);

  function resetForm() {
    setForm({
      _id: null,
      question: "",
      answer: "",
      tags: "",
      isPublished: true,
      order: 0,
    });
  }

  async function save(e) {
    e.preventDefault();
    const payload = {
      question: form.question,
      answer: form.answer,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isPublished: !!form.isPublished,
      order: Number(form.order) || 0,
    };

    const method = form._id ? "PUT" : "POST";
    const url = form._id ? `/api/faqs/${form._id}` : `/api/faqs`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Save failed (are you an admin?)");
      return;
    }

    resetForm();
    load();
  }

  async function editRow(r) {
    setForm({
      _id: r._id,
      question: r.question,
      answer: r.answer,
      tags: (r.tags || []).join(", "),
      isPublished: !!r.isPublished,
      order: r.order || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function delRow(id) {
    if (!confirm("Delete this FAQ?")) return;
    const res = await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Delete failed (are you an admin?)");
      return;
    }
    load();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Admin • FAQs
      </h1>

      {/* Create/Edit form */}
      <form
        onSubmit={save}
        className="mb-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] p-6"
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              Question
            </span>
            <input
              value={form.question}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, question: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] px-3 py-2 text-gray-900 dark:text-gray-100"
              required
            />
          </label>

          {/* WYSIWYG Answer field */}
          <div>
            <Editor
              name="answer"
              label="Answer"
              text={form.answer}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, answer: html }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                Tags (comma-separated)
              </span>
              <input
                value={form.tags}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tags: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] px-3 py-2 text-gray-900 dark:text-gray-100"
                placeholder="team,billing,profile"
              />
            </label>

            <label className="block">
              <span className="text-gray-900 dark:text-gray-100 font-semibold">
                Order
              </span>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, order: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] px-3 py-2 text-gray-900 dark:text-gray-100"
              />
            </label>

            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: e.target.checked,
                  }))
                }
              />
              <span className="text-gray-900 dark:text-gray-100">
                Published
              </span>
            </label>
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#d90429] px-4 py-2 font-semibold text-white hover:opacity-90"
            >
              {form._id ? "Update FAQ" : "Create FAQ"}
            </button>
            {form._id ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {/* Search & table */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search FAQs…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1b1c24] px-3 py-2 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={load}
          className="shrink-0 rounded-lg border px-4 py-2 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-300 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-[#16171d]">
            <tr className="text-left text-gray-900 dark:text-gray-100">
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Question</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Published</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-[#1b1c24]">
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-6 text-gray-900 dark:text-gray-100"
                >
                  Loading…
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => (
                <tr
                  key={r._id}
                  className="text-gray-900 dark:text-gray-100"
                >
                  <td className="px-4 py-2">{r.order || 0}</td>
                  <td className="px-4 py-2">{r.question}</td>
                  <td className="px-4 py-2">{(r.tags || []).join(", ")}</td>
                  <td className="px-4 py-2">{r.isPublished ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editRow(r)}
                        className="rounded-lg border px-3 py-1 text-sm border-gray-300 dark:border-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => delRow(r._id)}
                        className="rounded-lg bg-[#ef233c] px-3 py-1 text-sm text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-6 text-gray-900 dark:text-gray-100"
                >
                  No FAQs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
