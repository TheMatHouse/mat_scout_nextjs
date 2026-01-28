// components/teams/coach-notes/forms/EditCoachMatchModalButton.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import CountrySelect from "@/components/shared/CountrySelect";
import Editor from "@/components/shared/Editor";
import TechniqueTagInput from "@/components/shared/TechniqueTagInput";
import ClubAutosuggest from "@/components/shared/ClubAutosuggest";

/* ---------- small inputs ---------- */
function TextInput({ label, value, onChange, placeholder }) {
  return (
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
}

function NumberInput({ label, value, onChange, min = 0 }) {
  return (
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
}

/* ---------- video helpers ---------- */
const extractYouTubeId = (url = "") => {
  if (typeof url !== "string") return null;
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i;
  const m = url.match(re);
  return m ? m[1] : null;
};

const toNoCookieEmbedUrl = (videoId, startSeconds = 0) => {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return startSeconds > 0 ? `${base}?start=${startSeconds}` : base;
};

function VideoPreview({ url, startSeconds = 0, label }) {
  const vidId = extractYouTubeId(url);
  if (!vidId) return null;

  return (
    <div className="space-y-2">
      {label && <div className="text-sm opacity-80">{label}</div>}
      <div className="rounded-md overflow-hidden border">
        <iframe
          className="w-full aspect-video"
          src={toNoCookieEmbedUrl(vidId, startSeconds)}
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* ---------- main ---------- */
function EditCoachMatchModalButton({
  slug,
  eventId,
  entryId,
  matchId,
  initialMatch,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState({});
  const [loadedTechniques, setLoadedTechniques] = useState([]);
  const [hadSavedVideo, setHadSavedVideo] = useState(false);
  const [editingNewVideo, setEditingNewVideo] = useState(false);
  const disabled = !slug || !eventId || !entryId || !matchId;

  /* ---------- techniques ---------- */
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
        if (alive)
          setLoadedTechniques(
            arr
              .map((t, i) => ({ value: i, label: t.name }))
              .sort((a, b) => a.label.localeCompare(b.label)),
          );
      } catch {
        if (alive) setLoadedTechniques([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setField = (key) => (val) => setNote((n) => ({ ...n, [key]: val }));

  /* ---------- hydrate from DB ---------- */
  const hydrate = (m) => {
    const v = m.video || {};
    const startSeconds = Math.floor((v.startMs || 0) / 1000);
    const h = Math.floor(startSeconds / 3600);
    const min = Math.floor((startSeconds % 3600) / 60);
    const s = startSeconds % 60;

    setNote({
      opponentName: m.opponent?.name || "",
      opponentRank: m.opponent?.rank || "",
      opponentClub: m.opponent?.club || "",
      opponentCountry: m.opponent?.country || "",

      whatWentWell: m.whatWentWell || "",
      reinforce: m.reinforce || "",
      needsFix: m.needsFix || "",

      // ✅ techniques — SAME SHAPE AS ADD FORM
      techOurs: Array.isArray(m.techniques?.ours)
        ? m.techniques.ours.map((t, i) => ({ value: i, label: t }))
        : [],
      techTheirs: Array.isArray(m.techniques?.theirs)
        ? m.techniques.theirs.map((t, i) => ({ value: i, label: t }))
        : [],

      result: m.result || "",
      score: m.score || "",
      notes: m.notes || "",

      // ✅ video
      // ✅ video (match ADD form field names)
      videoTitle: v.label || "",
      videoUrlRaw: v.url || "",
      videoH: String(h),
      videoM: String(min),
      videoS: String(s),
      videoStartMs: v.startMs || 0,
    });

    const hasVideo = Boolean(v?.url);
    setHadSavedVideo(hasVideo);
    setEditingNewVideo(!hasVideo);
  };

  useEffect(() => {
    if (!open) return;

    if (initialMatch) hydrate(initialMatch);

    (async () => {
      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (res.ok && data.match) hydrate(data.match);
      } catch {
        toast.error("Failed to load note");
      }
    })();
  }, [open, slug, eventId, entryId, matchId]);

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const h = parseInt(note.videoH || "0", 10) || 0;
    const m = parseInt(note.videoM || "0", 10) || 0;
    const s = parseInt(note.videoS || "0", 10) || 0;
    const startMs = (h * 3600 + m * 60 + s) * 1000;

    const body = {
      opponent: {
        name: note.opponentName,
        rank: note.opponentRank,
        club: note.opponentClub,
        country: note.opponentCountry,
      },
      whatWentWell: note.whatWentWell,
      reinforce: note.reinforce,
      needsFix: note.needsFix,
      techniques: {
        ours: note.techOurs?.map((t) => t.label),
        theirs: note.techTheirs?.map((t) => t.label),
      },
      result: note.result,
      score: note.score,
      notes: note.notes,
    };

    if ((note.videoUrlRaw || "").trim()) {
      body.video = {
        url: note.videoUrlRaw.trim(),
        label: note.videoTitle || "",
        startMs,
      };
    } else {
      body.video = null;
    }

    const res = await fetch(
      `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json();
    if (!res.ok) return toast.error(data?.error || "Update failed");

    toast.success("Match updated");
    setOpen(false);
    router.refresh();
  };

  const startSeconds =
    (parseInt(note.videoH || "0", 10) || 0) * 3600 +
    (parseInt(note.videoM || "0", 10) || 0) * 60 +
    (parseInt(note.videoS || "0", 10) || 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-1 border rounded hover:bg-black/5 dark:hover:bg-white/10"
        disabled={disabled}
        title="Edit match"
      >
        ✏️
      </button>

      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit Match / Note"
        description="Update match details"
        withCard
      >
        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <TextInput
              label="Opponent name"
              value={note.opponentName || ""}
              onChange={setField("opponentName")}
            />
            <TextInput
              label="Opponent rank"
              value={note.opponentRank || ""}
              onChange={setField("opponentRank")}
            />
            <label className="grid gap-1">
              <span className="text-sm">Opponent club</span>
              <ClubAutosuggest
                value={note.opponentClub || ""}
                onChange={setField("opponentClub")}
              />
            </label>
            <CountrySelect
              label="Country"
              value={note.opponentCountry || ""}
              onChange={setField("opponentCountry")}
            />
          </div>

          <Editor
            label="What went well"
            text={note.whatWentWell || ""}
            onChange={setField("whatWentWell")}
          />
          <Editor
            label="What we should reinforce"
            text={note.reinforce || ""}
            onChange={setField("reinforce")}
          />
          <Editor
            label="What we need to fix"
            text={note.needsFix || ""}
            onChange={setField("needsFix")}
          />

          <TechniqueTagInput
            label="Techniques (ours)"
            suggestions={loadedTechniques}
            selected={note.techOurs || []}
            onAdd={(t) =>
              setNote((n) => ({ ...n, techOurs: [...(n.techOurs || []), t] }))
            }
            onDelete={(i) =>
              setNote((n) => ({
                ...n,
                techOurs: n.techOurs.filter((_, x) => x !== i),
              }))
            }
          />

          <TechniqueTagInput
            label="Techniques (theirs)"
            suggestions={loadedTechniques}
            selected={note.techTheirs || []}
            onAdd={(t) =>
              setNote((n) => ({
                ...n,
                techTheirs: [...(n.techTheirs || []), t],
              }))
            }
            onDelete={(i) =>
              setNote((n) => ({
                ...n,
                techTheirs: n.techTheirs.filter((_, x) => x !== i),
              }))
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={note.result || ""}
              onChange={(e) => setField("result")(e.target.value)}
              className="px-3 py-2 rounded border bg-transparent"
            >
              <option value="">Result</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="draw">Draw</option>
            </select>

            <TextInput
              label="Score"
              value={note.score || ""}
              onChange={setField("score")}
            />
          </div>

          <Editor
            label="More notes"
            text={note.notes || ""}
            onChange={setField("notes")}
          />

          <div className="border rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold">Video (optional)</div>

            <TextInput
              label="Video title"
              value={note.videoTitle || ""}
              onChange={setField("videoTitle")}
            />
            <TextInput
              label="YouTube URL"
              value={note.videoUrlRaw || ""}
              onChange={setField("videoUrlRaw")}
            />

            <div className="grid grid-cols-3 gap-3">
              <NumberInput
                label="Hours"
                value={note.videoH || "0"}
                onChange={setField("videoH")}
              />
              <NumberInput
                label="Minutes"
                value={note.videoM || "0"}
                onChange={setField("videoM")}
              />
              <NumberInput
                label="Seconds"
                value={note.videoS || "0"}
                onChange={setField("videoS")}
              />
            </div>

            {(note.videoUrlRaw || "").trim() && (
              <VideoPreview
                url={note.videoUrlRaw}
                startSeconds={startSeconds}
                label={note.videoTitle}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
            >
              Save Changes
            </button>
          </div>
        </form>
      </ModalLayout>
    </>
  );
}

export default EditCoachMatchModalButton;
