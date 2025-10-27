// components/teams/forms/AddCoachMatchModalButton.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import CountrySelect from "@/components/shared/CountrySelect";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";

/* ---------------- small inputs ---------------- */
const TextInput = ({ label, value, onChange, placeholder }) => (
  <label className="grid gap-1">
    {label && <span className="text-sm">{label}</span>}
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-3 py-2 rounded border bg-transparent"
    />
  </label>
);

const Select = ({ label, value, onChange, children }) => (
  <label className="grid gap-1">
    {label && <span className="text-sm">{label}</span>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded border bg-transparent"
    >
      {children}
    </select>
  </label>
);

/* ---------------- note block ---------------- */
const emptyNote = () => ({
  opponentName: "",
  opponentRank: "",
  opponentClub: "",
  opponentCountry: "",
  whatWentWell: "",
  reinforce: "",
  needsFix: "",
  techOurs: [],
  techTheirs: [],
  result: "",
  score: "",
  notes: "",
});

const NoteBlock = ({
  idx,
  value,
  onChange,
  suggestions,
  onRemove,
  canRemove,
}) => {
  // helpers to update subfields
  const set = (key) => (v) => onChange({ ...value, [key]: v });

  // technique dedup helpers
  const addUnique = (listKey) => (tag) => {
    const list = value[listKey] || [];
    if (list.some((p) => p.label.toLowerCase() === tag.label.toLowerCase()))
      return;
    onChange({ ...value, [listKey]: [...list, tag] });
  };
  const delAt = (listKey) => (i) => {
    const list = value[listKey] || [];
    onChange({ ...value, [listKey]: list.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Match / Note {idx + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm px-3 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Remove
          </button>
        )}
      </div>

      {/* Opponent */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Name */}
        <label className="grid gap-1">
          <span className="text-sm">Opponent name</span>
          <input
            value={value.opponentName}
            onChange={(e) => set("opponentName")(e.target.value)}
            placeholder="e.g., Alex Smith"
            className="px-3 py-2 h-10 rounded border bg-transparent"
          />
        </label>

        {/* Rank */}
        <label className="grid gap-1">
          <span className="text-sm">Opponent rank (optional)</span>
          <input
            value={value.opponentRank}
            onChange={(e) => set("opponentRank")(e.target.value)}
            placeholder="e.g., Brown Belt"
            className="px-3 py-2 h-10 rounded border bg-transparent"
          />
        </label>

        {/* Club */}
        <label className="grid gap-1">
          <span className="text-sm">Opponent club (optional)</span>
          <input
            value={value.opponentClub}
            onChange={(e) => set("opponentClub")(e.target.value)}
            placeholder="e.g., Tokyo JC"
            className="px-3 py-2 h-10 rounded border bg-transparent"
          />
        </label>

        {/* Country — the component renders its own label */}
        <CountrySelect
          label="Country"
          value={value.opponentCountry}
          onChange={set("opponentCountry")}
        />
      </div>

      {/* Notes */}
      <Editor
        name={`whatWentWell_${idx}`}
        label="What went well"
        text={value.whatWentWell}
        onChange={set("whatWentWell")}
      />
      <Editor
        name={`reinforce_${idx}`}
        label="What we should reinforce"
        text={value.reinforce}
        onChange={set("reinforce")}
      />
      <Editor
        name={`needsFix_${idx}`}
        label="What we need to fix"
        text={value.needsFix}
        onChange={set("needsFix")}
      />

      {/* Techniques */}
      <TechniqueTagInput
        label="Techniques (ours)"
        name={`techniquesOurs_${idx}`}
        suggestions={suggestions}
        selected={value.techOurs}
        onAdd={addUnique("techOurs")}
        onDelete={delAt("techOurs")}
      />
      <TechniqueTagInput
        label="Techniques (theirs)"
        name={`techniquesTheirs_${idx}`}
        suggestions={suggestions}
        selected={value.techTheirs}
        onAdd={addUnique("techTheirs")}
        onDelete={delAt("techTheirs")}
      />

      {/* Result / Score */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Result"
          value={value.result}
          onChange={set("result")}
        >
          <option value="">Result</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="draw">Draw</option>
        </Select>
        <TextInput
          label="Score"
          value={value.score}
          onChange={set("score")}
          placeholder="e.g., Ippon, 2-1"
        />
      </div>

      <Editor
        name={`notes_${idx}`}
        label="More notes (optional)"
        text={value.notes}
        onChange={set("notes")}
      />
    </div>
  );
};

/* ---------------- main component ---------------- */
const AddCoachMatchModalButton = ({ slug, eventId, entryId }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // multi-note state
  const [notes, setNotes] = useState([emptyNote()]);

  // load techniques for suggestions
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/techniques", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.techniques)
          ? data.techniques
          : [];

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
        console.error("Failed to fetch techniques:", e);
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

  const disabled = !slug || !eventId || !entryId;

  const resetForm = () => setNotes([emptyNote()]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) {
      toast.error("Missing team/event/entry identifiers.");
      return;
    }

    try {
      // Transform UI notes -> API payload(s)
      const payload = notes.map((n) => ({
        opponent: {
          name: n.opponentName || "",
          rank: n.opponentRank || "",
          club: n.opponentClub || "",
          country: n.opponentCountry || "",
        },
        whatWentWell: n.whatWentWell,
        reinforce: n.reinforce,
        needsFix: n.needsFix,
        techniques: {
          ours: (n.techOurs || []).map((t) => t.label),
          theirs: (n.techTheirs || []).map((t) => t.label),
        },
        result: n.result,
        score: n.score,
        notes: n.notes,
      }));

      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: payload }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to add note(s)"
        );
      }

      toast.success(
        Array.isArray(data?.notes) && data.notes.length > 1
          ? "Match notes added"
          : "Match note added"
      );

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Server error");
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`px-3 py-2 rounded-md ${
          disabled
            ? "opacity-50 cursor-not-allowed border"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}
        title={
          disabled
            ? "Missing event or athlete — cannot add note"
            : "Add a new match/note"
        }
      >
        Add Note
      </button>

      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add New Match / Note"
        description="Record match details for this athlete."
        withCard
      >
        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
          {notes.map((n, i) => (
            <NoteBlock
              key={i}
              idx={i}
              value={n}
              suggestions={suggestions}
              onChange={(val) =>
                setNotes((prev) => prev.map((p, idx) => (idx === i ? val : p)))
              }
              onRemove={() =>
                setNotes((prev) => prev.filter((_, idx) => idx !== i))
              }
              canRemove={notes.length > 1}
            />
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setNotes((prev) => [...prev, emptyNote()])}
              className="px-4 py-2 rounded-xl border"
            >
              ➕ Add another note for this athlete
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black"
              disabled={disabled}
            >
              Save Note(s)
            </button>
          </div>
        </form>
      </ModalLayout>
    </>
  );
};

export default AddCoachMatchModalButton;
