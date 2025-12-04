// components/teams/coach-notes/forms/AddCoachMatchModalButton.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import ModalLayout from "@/components/shared/ModalLayout";
import CountrySelect from "@/components/shared/CountrySelect";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import ClubAutosuggest from "@/components/shared/ClubAutosuggest";

/*** 🔐 TEAM LOCK HELPERS ***/
import {
  teamHasLock,
  ensureTeamPass,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

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
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i;
  const m = url.trim().match(re);
  return m ? m[1] : null;
};

const toNoCookieEmbedUrl = (videoId, startSeconds = 0) => {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return startSeconds > 0 ? `${base}?start=${startSeconds}` : base;
};

/* ---------------- empty note ---------------- */
const emptyNote = () => ({
  opponentName: "",
  opponentRank: "",
  opponentClub: "",
  opponentCountry: "",
  whatWentWell: "",
  reinforce: "",
  needsFix: "",
  notes: "",
  techOurs: [],
  techTheirs: [],
  result: "",
  score: "",
  videoTitle: "",
  videoUrlRaw: "",
  videoH: "0",
  videoM: "0",
  videoS: "0",
});

/* ---------------- NoteBlock ---------------- */
const NoteBlock = ({
  idx,
  value,
  update,
  suggestions,
  onRemove,
  canRemove,
}) => {
  const onField = (field, v) => update(idx, field, v);

  const addUnique = (field) => (tag) => {
    const list = value[field] || [];
    if (list.some((p) => p.label.toLowerCase() === tag.label.toLowerCase()))
      return;
    update(idx, field, [...list, tag]);
  };

  const delAt = (field) => (i) => {
    const list = value[field] || [];
    update(
      idx,
      field,
      list.filter((_, x) => x !== i)
    );
  };

  const h = Math.max(0, parseInt(value.videoH || "0") || 0);
  const m = Math.max(0, parseInt(value.videoM || "0") || 0);
  const s = Math.max(0, parseInt(value.videoS || "0") || 0);
  const startSeconds = h * 3600 + m * 60 + s;

  const vidId = extractYouTubeId(value.videoUrlRaw);
  const previewSrc = vidId ? toNoCookieEmbedUrl(vidId, startSeconds) : "";

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
        <TextInput
          label="Opponent name"
          value={value.opponentName}
          onChange={(v) => onField("opponentName", v)}
        />

        <TextInput
          label="Opponent rank"
          value={value.opponentRank}
          onChange={(v) => onField("opponentRank", v)}
        />

        <div className="grid gap-1">
          <span className="text-sm">Opponent club</span>
          <ClubAutosuggest
            value={value.opponentClub || ""}
            onChange={(v) => onField("opponentClub", v)}
            minChars={2}
          />
        </div>

        <CountrySelect
          label="Country"
          value={value.opponentCountry}
          onChange={(v) => onField("opponentCountry", v)}
        />
      </div>

      <Editor
        name={`whatWentWell_${idx}`}
        label="What went well"
        text={value.whatWentWell}
        onChange={(v) => onField("whatWentWell", v)}
      />

      <Editor
        name={`reinforce_${idx}`}
        label="What we should reinforce"
        text={value.reinforce}
        onChange={(v) => onField("reinforce", v)}
      />

      <Editor
        name={`needsFix_${idx}`}
        label="What we need to fix"
        text={value.needsFix}
        onChange={(v) => onField("needsFix", v)}
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
          onChange={(v) => onField("result", v)}
        >
          <option value="">Result</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="draw">Draw</option>
        </Select>

        <TextInput
          label="Score"
          value={value.score}
          onChange={(v) => onField("score", v)}
        />
      </div>

      <Editor
        name={`notes_${idx}`}
        label="More notes"
        text={value.notes}
        onChange={(v) => onField("notes", v)}
      />

      {/* Video */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="font-semibold text-sm">Video (optional)</div>

        <TextInput
          label="Video Title"
          value={value.videoTitle}
          onChange={(v) => onField("videoTitle", v)}
        />

        <TextInput
          label="YouTube URL"
          value={value.videoUrlRaw}
          onChange={(v) => onField("videoUrlRaw", v)}
        />

        <div className="space-y-2">
          <div className="text-sm">Timestamp</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberInput
              label="Hours"
              value={value.videoH}
              onChange={(v) => onField("videoH", v)}
            />
            <NumberInput
              label="Minutes"
              value={value.videoM}
              onChange={(v) => onField("videoM", v)}
            />
            <NumberInput
              label="Seconds"
              value={value.videoS}
              onChange={(v) => onField("videoS", v)}
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
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------- */
/* ---------------- MAIN BUTTON --------------- */
/* -------------------------------------------- */

const AddCoachMatchModalButton = ({ slug, eventId, entryId }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([emptyNote()]);
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [team, setTeam] = useState(null);

  /* load team */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/teams/${slug}`, { cache: "no-store" });
        const data = await res.json();
        if (alive) setTeam(data?.team || null);
      } catch (err) {
        if (alive) setTeam(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  /* load techniques */
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
          String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
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

  const updateField = (idx, field, value) => {
    setNotes((prev) => {
      const copy = structuredClone(prev);
      copy[idx][field] = value;
      return copy;
    });
  };

  const disabled = !slug || !eventId || !entryId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) {
      toast.error("Missing team/event/entry identifiers.");
      return;
    }

    try {
      let pass = "";
      const locked = team && teamHasLock(team);
      if (locked) {
        pass = await ensureTeamPass(team);
      }

      const payload = [];

      for (const n of notes) {
        const h = Math.max(0, parseInt(n.videoH || "0") || 0);
        const m = Math.max(0, parseInt(n.videoM || "0") || 0);
        const s = Math.max(0, parseInt(n.videoS || "0") || 0);
        const startMs = (h * 3600 + m * 60 + s) * 1000;

        const opponent = {
          name: n.opponentName || "",
          rank: n.opponentRank || "",
          club: n.opponentClub || "",
          country: n.opponentCountry || "",
        };

        const sensitive = {
          whatWentWell: n.whatWentWell || "",
          reinforce: n.reinforce || "",
          needsFix: n.needsFix || "",
          notes: n.notes || "",
          techniques: {
            ours: (n.techOurs || []).map((t) => t.label),
            theirs: (n.techTheirs || []).map((t) => t.label),
          },
          result: n.result || "",
          score: n.score || "",
        };

        const video = n.videoUrlRaw
          ? {
              url: n.videoUrlRaw,
              label: n.videoTitle || "",
              startMs,
            }
          : {};

        if (locked) {
          const { body: encBody, crypto } = await encryptCoachNoteBody(
            team,
            sensitive
          );

          payload.push({
            opponent,
            video,
            crypto,
            ...encBody,
          });
        } else {
          payload.push({
            opponent,
            video,
            crypto: null,
            ...sensitive,
          });
        }
      }

      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: payload }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to add note(s)");

      toast.success(
        Array.isArray(data?.notes) && data.notes.length > 1
          ? "Match notes added"
          : "Match note added"
      );

      setNotes([emptyNote()]);
      setOpen(false);
      router.refresh();
    } catch (err) {
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
              update={updateField}
              suggestions={suggestions}
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
