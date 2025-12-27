"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import CountrySelect from "@/components/shared/CountrySelect";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import ClubAutosuggest from "@/components/shared/ClubAutosuggest";

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

const NumberInput = ({ label, value, onChange, min = 0 }) => (
  <label className="grid gap-1">
    {label && <span className="text-sm">{label}</span>}
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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

/* ---------------- youtube helpers ---------------- */
const extractYouTubeId = (url = "") => {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i;
  const m = u.match(re);
  return m ? m[1] : null;
};

const toNoCookieEmbedUrl = (videoId, startSeconds = 0) => {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return startSeconds > 0 ? `${base}?start=${startSeconds}` : base;
};

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
  videoTitle: "",
  videoUrlRaw: "",
  videoH: "0",
  videoM: "0",
  videoS: "0",
});

const NoteBlock = ({
  idx,
  value,
  onFieldChange,
  suggestions,
  onRemove,
  canRemove,
}) => {
  const h = Math.max(0, parseInt(value.videoH || "0", 10) || 0);
  const m = Math.max(0, parseInt(value.videoM || "0", 10) || 0);
  const s = Math.max(0, parseInt(value.videoS || "0", 10) || 0);
  const startSeconds = h * 3600 + m * 60 + s;

  const vidId = extractYouTubeId(value.videoUrlRaw);
  const previewSrc = vidId ? toNoCookieEmbedUrl(vidId, startSeconds) : "";

  const addUnique = (listKey) => (tag) => {
    const list = Array.isArray(value[listKey]) ? value[listKey] : [];
    if (
      list.some(
        (p) =>
          String(p?.label || "").toLowerCase() ===
          String(tag?.label || "").toLowerCase()
      )
    )
      return;
    onFieldChange(idx, listKey, [...list, tag]);
  };

  const delAt = (listKey) => (i) => {
    const list = Array.isArray(value[listKey]) ? value[listKey] : [];
    onFieldChange(
      idx,
      listKey,
      list.filter((_, j) => j !== i)
    );
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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm">Opponent name</span>
          <input
            value={value.opponentName}
            onChange={(e) => onFieldChange(idx, "opponentName", e.target.value)}
            placeholder="e.g., Alex Smith"
            className="px-3 py-2 h-10 rounded border bg-transparent"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Opponent rank (optional)</span>
          <input
            value={value.opponentRank}
            onChange={(e) => onFieldChange(idx, "opponentRank", e.target.value)}
            placeholder="e.g., Brown Belt"
            className="px-3 py-2 h-10 rounded border bg-transparent"
          />
        </label>

        <div className="grid gap-1">
          <span className="text-sm">Opponent club (optional)</span>
          <ClubAutosuggest
            value={value.opponentClub || ""}
            onChange={(v) => onFieldChange(idx, "opponentClub", v)}
            minChars={2}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Type the opponent’s club name — if it exists, you can select it;
            otherwise, enter it manually.
          </p>
        </div>

        <CountrySelect
          label="Country"
          value={value.opponentCountry}
          onChange={(v) => onFieldChange(idx, "opponentCountry", v)}
        />
      </div>

      <Editor
        name={`whatWentWell_${idx}`}
        label="What went well"
        text={value.whatWentWell}
        onChange={(v) => onFieldChange(idx, "whatWentWell", v)}
      />

      <Editor
        name={`reinforce_${idx}`}
        label="What we should reinforce"
        text={value.reinforce}
        onChange={(v) => onFieldChange(idx, "reinforce", v)}
      />

      <Editor
        name={`needsFix_${idx}`}
        label="What we need to fix"
        text={value.needsFix}
        onChange={(v) => onFieldChange(idx, "needsFix", v)}
      />

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

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Result"
          value={value.result}
          onChange={(v) => onFieldChange(idx, "result", v)}
        >
          <option value="">Result</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="draw">Draw</option>
        </Select>

        <TextInput
          label="Score"
          value={value.score}
          onChange={(v) => onFieldChange(idx, "score", v)}
          placeholder="e.g., Ippon, 2-1"
        />
      </div>

      <Editor
        name={`notes_${idx}`}
        label="More notes (optional)"
        text={value.notes}
        onChange={(v) => onFieldChange(idx, "notes", v)}
      />

      <div className="rounded-lg border p-4 space-y-4">
        <div className="text-sm font-semibold">Video (optional)</div>

        <TextInput
          label="Video Title"
          value={value.videoTitle}
          onChange={(v) => onFieldChange(idx, "videoTitle", v)}
          placeholder="First exchange"
        />

        <TextInput
          label="YouTube URL"
          value={value.videoUrlRaw}
          onChange={(v) => onFieldChange(idx, "videoUrlRaw", v)}
          placeholder="Paste YouTube link"
        />

        <div className="space-y-2">
          <div className="text-sm">Timestamp</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumberInput
              label="Hours"
              value={value.videoH}
              onChange={(v) => onFieldChange(idx, "videoH", v)}
            />
            <NumberInput
              label="Minutes"
              value={value.videoM}
              onChange={(v) => onFieldChange(idx, "videoM", v)}
            />
            <NumberInput
              label="Seconds"
              value={value.videoS}
              onChange={(v) => onFieldChange(idx, "videoS", v)}
            />
          </div>
        </div>

        {previewSrc && (
          <div className="rounded-md overflow-hidden border">
            <iframe
              className="w-full aspect-video"
              src={previewSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`YouTube video ${vidId}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- main component ---------------- */
const AddCoachMatchModalButton = ({ slug, eventId, entryId }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([emptyNote()]);
  const [loadedTechniques, setLoadedTechniques] = useState([]);

  const onFieldChange = (idx, key, value) => {
    setNotes((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, [key]: value } : n))
    );
  };

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

  const disabled = !slug || !eventId || !entryId;
  const resetForm = () => setNotes([emptyNote()]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (disabled) {
      toast.error("Missing team/event/entry identifiers.");
      return;
    }

    try {
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notes),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to add note(s)");

      toast.success(
        Array.isArray(data?.notes) && data.notes.length > 1
          ? "Match notes added"
          : "Match note added"
      );
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err?.message || "Server error");
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
              onFieldChange={onFieldChange}
              onRemove={() =>
                setNotes((prev) => prev.filter((_, j) => j !== i))
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
