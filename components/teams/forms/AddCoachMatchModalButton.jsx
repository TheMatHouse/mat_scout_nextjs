// components/teams/forms/AddCoachMatchModalButton.jsx
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import ModalLayout from "@/components/shared/ModalLayout";
import Editor from "@/components/shared/Editor";
import CountrySelect from "@/components/shared/CountrySelect";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";

const emptyNote = () => ({
  opponentName: "",
  opponentRank: "",
  opponentClub: "",
  opponentCountry: "",
  wentWell: "",
  reinforce: "",
  needsFix: "",
  techOursTags: [], // [{label, value}]
  techTheirsTags: [], // [{label, value}]
  result: "",
  score: "",
  notes: "",
});

const AddCoachMatchModalButton = ({ slug, entryId }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([emptyNote()]);
  const [saving, setSaving] = useState(false);

  // Load technique suggestions from /api/techniques (same source as scouting)
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/techniques", { cache: "no-store" });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const sorted = [...arr].sort((a, b) =>
          String(a?.name ?? "").localeCompare(
            String(b?.name ?? ""),
            undefined,
            {
              sensitivity: "base",
            }
          )
        );
        if (alive) setLoadedTechniques(sorted);
      } catch (e) {
        console.error("Error fetching techniques:", e);
        if (alive) setLoadedTechniques([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const suggestions = useMemo(
    () => loadedTechniques.map((t, i) => ({ value: i, label: t.name })),
    [loadedTechniques]
  );

  const addAnother = () => setNotes((prev) => [...prev, emptyNote()]);
  const removeNote = (idx) =>
    setNotes((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );

  const update = (idx, key, value) =>
    setNotes((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });

  const addTech = (idx, field /* 'techOursTags' | 'techTheirsTags' */, item) =>
    setNotes((prev) => {
      const next = [...prev];
      const arr = next[idx][field] || [];
      next[idx][field] = [...arr, item];
      return next;
    });

  const delTech = (idx, field, removeIndex) =>
    setNotes((prev) => {
      const next = [...prev];
      const arr = next[idx][field] || [];
      next[idx][field] = arr.filter((_, i) => i !== removeIndex);
      return next;
    });

  const saveAll = useCallback(async () => {
    try {
      setSaving(true);

      // Skip completely empty blocks
      const nonEmpty = notes.filter((n) => {
        const s = (x) => (x || "").trim();
        const anyTech =
          (n.techOursTags?.length || 0) + (n.techTheirsTags?.length || 0) > 0;
        return (
          s(n.opponentName) ||
          s(n.opponentRank) ||
          s(n.opponentClub) ||
          s(n.opponentCountry) ||
          s(n.wentWell) ||
          s(n.reinforce) ||
          s(n.needsFix) ||
          anyTech ||
          s(n.result) ||
          s(n.score) ||
          s(n.notes)
        );
      });

      if (!nonEmpty.length) {
        toast.info("Nothing to save yet.");
        return;
      }

      // Post each note independently to existing single-note route
      for (const n of nonEmpty) {
        const payload = {
          opponent: {
            name: n.opponentName,
            rank: n.opponentRank,
            club: n.opponentClub,
            country: n.opponentCountry,
          },
          whatWentWell: n.wentWell,
          reinforce: n.reinforce,
          needsFix: n.needsFix,
          techniques: {
            // match scouting’s serialization: array of lowercased strings
            ours: (n.techOursTags || [])
              .map((t) => (t?.label || "").toLowerCase())
              .filter(Boolean),
            theirs: (n.techTheirsTags || [])
              .map((t) => (t?.label || "").toLowerCase())
              .filter(Boolean),
          },
          result: n.result,
          score: n.score,
          notes: n.notes,
        };

        const res = await fetch(
          `/api/teams/${slug}/coach-notes/entries/${entryId}/matches`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          let msg = `Failed to add a match note (${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch {}
          throw new Error(msg);
        }
      }

      toast.success(
        nonEmpty.length === 1
          ? "Match note saved"
          : `${nonEmpty.length} notes saved`
      );
      setNotes([emptyNote()]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err?.message || "Failed to save note(s)");
    } finally {
      setSaving(false);
    }
  }, [notes, slug, entryId, router]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded bg-black text-white dark:bg-white dark:text-black"
      >
        Add Note
      </button>

      <ModalLayout
        isOpen={open}
        onClose={setOpen}
        title="Add New Match / Note"
        description="Record match details for this athlete."
        withCard
      >
        <div className="grid gap-6">
          {notes.map((n, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-xl border p-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Note {idx + 1}</h4>
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeNote(idx)}
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Top row — consistent height */}
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={n.opponentName}
                  onChange={(e) => update(idx, "opponentName", e.target.value)}
                  name={`opponentName_${idx}`}
                  placeholder="Opponent name"
                  className="px-3 py-2 h-10 rounded border bg-transparent"
                />
                <input
                  value={n.opponentRank}
                  onChange={(e) => update(idx, "opponentRank", e.target.value)}
                  name={`opponentRank_${idx}`}
                  placeholder="Opponent rank (optional)"
                  className="px-3 py-2 h-10 rounded border bg-transparent"
                />

                <input
                  value={n.opponentClub}
                  onChange={(e) => update(idx, "opponentClub", e.target.value)}
                  name={`opponentClub_${idx}`}
                  placeholder="Opponent club (optional)"
                  className="px-3 py-2 h-10 rounded border bg-transparent"
                />
                <div className="grid gap-1">
                  <label className="text-sm">Country</label>
                  <CountrySelect
                    name={`opponentCountry_${idx}`}
                    value={n.opponentCountry}
                    onChange={(val) => update(idx, "opponentCountry", val)}
                    placeholder="Opponent country (optional)"
                    className="px-3 py-2 h-10 rounded border bg-transparent"
                  />
                </div>
              </div>

              {/* Editor-based fields */}
              <div className="grid gap-2">
                <label className="text-sm">What went well</label>
                <Editor
                  value={n.wentWell}
                  onChange={(v) => update(idx, "wentWell", v)}
                  placeholder="Notes on what went well…"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">What we should reinforce</label>
                <Editor
                  value={n.reinforce}
                  onChange={(v) => update(idx, "reinforce", v)}
                  placeholder="Key points to reinforce…"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">What we need to fix</label>
                <Editor
                  value={n.needsFix}
                  onChange={(v) => update(idx, "needsFix", v)}
                  placeholder="Issues to address / fix…"
                />
              </div>

              {/* Technique tags (ours / theirs) — same component/shape as scouting */}
              <TechniqueTagInput
                label="Techniques (ours)"
                name={`techOurs_${idx}`}
                suggestions={suggestions}
                selected={n.techOursTags}
                onAdd={(item) => addTech(idx, "techOursTags", item)}
                onDelete={(removeIndex) =>
                  delTech(idx, "techOursTags", removeIndex)
                }
              />
              <TechniqueTagInput
                label="Techniques (theirs)"
                name={`techTheirs_${idx}`}
                suggestions={suggestions}
                selected={n.techTheirsTags}
                onAdd={(item) => addTech(idx, "techTheirsTags", item)}
                onDelete={(removeIndex) =>
                  delTech(idx, "techTheirsTags", removeIndex)
                }
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={n.result}
                  onChange={(e) => update(idx, "result", e.target.value)}
                  name={`result_${idx}`}
                  className="px-3 py-2 h-10 rounded border bg-transparent"
                >
                  <option value="">Result</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="draw">Draw</option>
                </select>
                <input
                  value={n.score}
                  onChange={(e) => update(idx, "score", e.target.value)}
                  name={`score_${idx}`}
                  placeholder="Score (e.g., Ippon, Waza-ari, 2-1)"
                  className="px-3 py-2 h-10 rounded border bg-transparent"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm">More notes (optional)</label>
                <Editor
                  value={n.notes}
                  onChange={(v) => update(idx, "notes", v)}
                  placeholder="Any additional observations…"
                />
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addAnother}
              className="px-4 py-2 rounded-xl shadow bg-gray-200 dark:bg-zinc-800"
            >
              Add another note for this athlete
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Note(s)"}
            </button>
          </div>
        </div>
      </ModalLayout>
    </>
  );
};

export default AddCoachMatchModalButton;
