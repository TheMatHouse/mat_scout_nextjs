"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import CountrySelect from "@/components/shared/CountrySelect";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";

/* ---------- helpers to mirror the Add form ---------- */
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

const toTagArray = (arr) =>
  Array.isArray(arr)
    ? arr
        .filter(Boolean)
        .map((s, i) => (typeof s === "string" ? { value: i, label: s } : s))
    : [];

/* ---------- small UI bits ---------- */
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

/* ---------- main ---------- */
const EditCoachMatchModalButton = ({
  slug,
  eventId,
  entryId,
  matchId,
  initialMatch, // optional; if omitted we fetch it
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [note, setNote] = useState(emptyNote());
  const disabled = !slug || !eventId || !entryId || !matchId;

  // techniques suggestions (same as Add)
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
      } catch {
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

  // map server match -> local note shape
  const hydrateFromMatch = (m) => {
    const opp = m?.opponent || {};
    const tech = m?.techniques || {};
    setNote({
      opponentName:
        (opp.firstName || opp.lastName
          ? `${opp.firstName || ""} ${opp.lastName || ""}`.trim()
          : opp.name) || "",
      opponentRank: opp.rank || "",
      opponentClub: opp.club || "",
      opponentCountry: opp.country || "",
      whatWentWell: m?.whatWentWell || "",
      reinforce: m?.reinforce || "",
      needsFix: m?.needsFix || "",
      techOurs: toTagArray(tech?.ours),
      techTheirs: toTagArray(tech?.theirs),
      result: m?.result || "",
      score: m?.score || "",
      notes: m?.notes || "",
    });
  };

  // When opening, prefill either from prop or fetch
  useEffect(() => {
    if (!open) return;
    if (initialMatch) {
      hydrateFromMatch(initialMatch);
      return;
    }
    // fetch one match
    (async () => {
      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.match) {
          throw new Error(data?.error || "Failed to load note");
        }
        hydrateFromMatch(data.match);
      } catch (e) {
        toast.error(e.message || "Failed to load note");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // technique tag helpers
  const addUnique = (listKey) => (tag) => {
    const list = note[listKey] || [];
    if (list.some((p) => p.label.toLowerCase() === tag.label.toLowerCase()))
      return;
    setNote((n) => ({ ...n, [listKey]: [...list, tag] }));
  };
  const delAt = (listKey) => (i) => {
    const list = note[listKey] || [];
    setNote((n) => ({ ...n, [listKey]: list.filter((_, idx) => idx !== i) }));
  };
  const setField = (k) => (v) => setNote((n) => ({ ...n, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) {
      toast.error("Missing identifiers to edit this note.");
      return;
    }
    try {
      const payload = {
        opponent: {
          // Preserve your add-form’s single name field
          name: note.opponentName || "",
          rank: note.opponentRank || "",
          club: note.opponentClub || "",
          country: note.opponentCountry || "",
        },
        whatWentWell: note.whatWentWell,
        reinforce: note.reinforce,
        needsFix: note.needsFix,
        techniques: {
          ours: (note.techOurs || []).map((t) => t.label),
          theirs: (note.techTheirs || []).map((t) => t.label),
        },
        result: note.result,
        score: note.score,
        notes: note.notes,
      };

      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || "Failed to update note"
        );
      }

      toast.success("Match note updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Server error");
    }
  };

  return (
    <>
      {/* SINGLE, non-circular edit button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title="Edit note"
        aria-label="Edit note"
        className={`px-2 py-1 rounded-md border hover:bg-black/5 dark:hover:bg-white/10 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {/* simple pencil svg, no circular chrome */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline-block align-middle"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </button>

      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit Match / Note"
        description="Update the details for this match."
        withCard
      >
        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
          {/* Opponent */}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Opponent name"
              value={note.opponentName}
              onChange={setField("opponentName")}
              placeholder="e.g., Alex Smith"
            />
            <TextInput
              label="Opponent rank (optional)"
              value={note.opponentRank}
              onChange={setField("opponentRank")}
              placeholder="e.g., Brown Belt"
            />
            <TextInput
              label="Opponent club (optional)"
              value={note.opponentClub}
              onChange={setField("opponentClub")}
              placeholder="e.g., Tokyo JC"
            />
            <CountrySelect
              label="Country"
              value={note.opponentCountry}
              onChange={setField("opponentCountry")}
            />
          </div>

          {/* Notes */}
          <Editor
            name="whatWentWell_edit"
            label="What went well"
            text={note.whatWentWell}
            onChange={setField("whatWentWell")}
          />
          <Editor
            name="reinforce_edit"
            label="What we should reinforce"
            text={note.reinforce}
            onChange={setField("reinforce")}
          />
          <Editor
            name="needsFix_edit"
            label="What we need to fix"
            text={note.needsFix}
            onChange={setField("needsFix")}
          />

          {/* Techniques */}
          <TechniqueTagInput
            label="Techniques (ours)"
            name="techniquesOurs_edit"
            suggestions={suggestions}
            selected={note.techOurs}
            onAdd={addUnique("techOurs")}
            onDelete={delAt("techOurs")}
          />
          <TechniqueTagInput
            label="Techniques (theirs)"
            name="techniquesTheirs_edit"
            suggestions={suggestions}
            selected={note.techTheirs}
            onAdd={addUnique("techTheirs")}
            onDelete={delAt("techTheirs")}
          />

          {/* Result / Score */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Result"
              value={note.result}
              onChange={setField("result")}
            >
              <option value="">Result</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="draw">Draw</option>
            </Select>
            <TextInput
              label="Score"
              value={note.score}
              onChange={setField("score")}
              placeholder="e.g., Ippon, 2-1"
            />
          </div>

          <Editor
            name="notes_edit"
            label="More notes (optional)"
            text={note.notes}
            onChange={setField("notes")}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black"
            >
              Save Changes
            </button>
          </div>
        </form>
      </ModalLayout>
    </>
  );
};

export default EditCoachMatchModalButton;
