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

/* ---------- tiny inputs ---------- */
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
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?/]+)/i;
  const m = url.match(re);
  return m ? m[1] : null;
};

// Use regular youtube.com to avoid CSP mismatches
const toEmbedUrl = (id, start = 0) =>
  id ? `https://www.youtube.com/embed/${id}?start=${start}` : "";

const isLikelyFileVideo = (url = "") =>
  /\.mp4($|\?)/i.test(url) || /res\.cloudinary\.com/i.test(url);

function VideoPreview({ url, startMs = 0, label }) {
  const start = Math.max(0, Math.floor((startMs || 0) / 1000));
  const ytId = extractYouTubeId(url);
  const embed = ytId ? toEmbedUrl(ytId, start) : "";
  const vidRef = useRef(null);

  useEffect(() => {
    if (!ytId && isLikelyFileVideo(url) && vidRef.current && start > 0) {
      const el = vidRef.current;
      const jump = () => {
        try {
          el.currentTime = start;
        } catch {}
      };
      if (el.readyState >= 1) jump();
      else el.addEventListener("loadedmetadata", jump, { once: true });
    }
  }, [url, ytId, start]);

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm opacity-80">{label}</div> : null}
      <div className="overflow-hidden rounded border">
        {embed ? (
          <iframe
            src={embed}
            className="w-full aspect-video"
            allowFullScreen
          />
        ) : (
          <video
            ref={vidRef}
            className="w-full aspect-video"
            controls
            src={url}
          />
        )}
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

  // Video UI state
  const [videoLoading, setVideoLoading] = useState(false);
  const [hadSavedVideo, setHadSavedVideo] = useState(false); // from DB
  const [editingNewVideo, setEditingNewVideo] = useState(false); // true when adding/changing

  const disabled = !slug || !eventId || !entryId || !matchId;

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
              .sort((a, b) => a.label.localeCompare(b.label))
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

  const clearVideoFields = () =>
    setNote((n) => ({
      ...n,
      videoLabel: "",
      videoUrl: "",
      videoH: "0",
      videoM: "0",
      videoS: "0",
      videoStartMs: 0,
    }));

  const hydrate = (m) => {
    const v = m.video || {};
    const startSeconds = v.startMs ? Math.floor(v.startMs / 1000) : 0;
    const h = Math.floor(startSeconds / 3600);
    const m_ = Math.floor((startSeconds % 3600) / 60);
    const s = startSeconds % 60;

    setNote({
      opponentName: m.opponent?.name || "",
      opponentRank: m.opponent?.rank || "",
      opponentClub: m.opponent?.club || "",
      opponentCountry: m.opponent?.country || "",
      whatWentWell: m.whatWentWell || "",
      reinforce: m.reinforce || "",
      needsFix: m.needsFix || "",
      techOurs: (m.techniques?.ours || []).map((t, i) => ({
        value: i,
        label: t,
      })),
      techTheirs: (m.techniques?.theirs || []).map((t, i) => ({
        value: i,
        label: t,
      })),
      result: m.result || "",
      score: m.score || "",
      notes: m.notes || "",
      videoLabel: v.label || "",
      videoUrl: v.url || "",
      videoH: String(h),
      videoM: String(m_),
      videoS: String(s),
      videoStartMs: v.startMs || 0,
    });

    const exists = Boolean(v && v.url);
    setHadSavedVideo(exists);
    setEditingNewVideo(!exists); // if no saved video, we start in "add" mode
  };

  useEffect(() => {
    if (!open) return;

    if (initialMatch) hydrate(initialMatch);

    setVideoLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok && data.match) hydrate(data.match);
        else toast.error(data?.error || "Failed to load note");
      } catch {
        toast.error("Failed to load note");
      } finally {
        setVideoLoading(false);
      }
    })();
  }, [open, slug, eventId, entryId, matchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build startMs EXACTLY like Add form
    const h = Number.parseInt(note.videoH ?? "0", 10) || 0;
    const m = Number.parseInt(note.videoM ?? "0", 10) || 0;
    const s = Number.parseInt(note.videoS ?? "0", 10) || 0;
    const startMs = (h * 3600 + m * 60 + s) * 1000;

    const trimmedUrl = (note.videoUrl || "").trim();
    const trimmedLabel = (note.videoLabel || "").trim();

    // Base payload (same shape as Add)
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
      // ⬇️ video is handled below
    };

    /**
     * Video rules — IDENTICAL to Add behavior:
     * - If user typed a URL => include a full `video` object (save/replace).
     * - If user cleared URL *after hitting Remove* => send `video: null` (clear).
     * - Otherwise (no change) => do not include `video` at all (keep original).
     */
    const userIsEditingVideo = true; // we’re in the edit form; deciding by current fields
    const userClearedVideo = !trimmedUrl && (hadSavedVideo || editingNewVideo);

    if (trimmedUrl) {
      body.video = { url: trimmedUrl, label: trimmedLabel, startMs };
    } else if (userClearedVideo) {
      body.video = null; // explicit clear
    }
    // else: omit body.video completely -> backend leaves as-is

    const res = await fetch(
      `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) return toast.error(data?.error || "Update failed");
    toast.success("Match updated");
    setOpen(false);
    router.refresh();
  };

  // live preview timestamp for editing state
  const startSecs =
    (Number.parseInt(note.videoH ?? "0", 10) || 0) * 3600 +
    (Number.parseInt(note.videoM ?? "0", 10) || 0) * 60 +
    (Number.parseInt(note.videoS ?? "0", 10) || 0);

  // UI logic:
  // - If there was a saved video and we're NOT editingNewVideo => show preview + "Remove video" (no fields).
  // - Otherwise (adding or changing) => show URL + Title + Timestamp fields, plus live preview if URL present.
  const showSavedPreviewOnly = hadSavedVideo && !editingNewVideo;

  return (
    <>
      {/* DO NOT CHANGE THIS PENCIL */}
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
            name="well"
            label="What went well"
            text={note.whatWentWell || ""}
            onChange={setField("whatWentWell")}
          />
          <Editor
            name="reinforce"
            label="What we should reinforce"
            text={note.reinforce || ""}
            onChange={setField("reinforce")}
          />
          <Editor
            name="fix"
            label="What we need to fix"
            text={note.needsFix || ""}
            onChange={setField("needsFix")}
          />

          <TechniqueTagInput
            label="Techniques (ours)"
            name="ours"
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
            name="theirs"
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

          {/* VIDEO SECTION */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold">Video (optional)</div>

            {videoLoading ? (
              <div className="w-full aspect-video rounded border animate-pulse" />
            ) : showSavedPreviewOnly ? (
              // Case: DB has a saved video and user is NOT editing it yet
              <div className="space-y-3">
                <VideoPreview
                  url={note.videoUrl}
                  startMs={note.videoStartMs || 0}
                  label={note.videoLabel}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNewVideo(true); // you're changing/adding a video now
                      clearVideoFields(); // blank title/url/timestamp
                    }}
                    className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Remove video
                  </button>
                </div>
              </div>
            ) : (
              // Case: adding a new video OR changing an existing one
              <div className="space-y-3">
                <TextInput
                  label="Video title"
                  value={note.videoLabel || ""}
                  onChange={setField("videoLabel")}
                  placeholder="e.g., First exchange"
                />
                <TextInput
                  label="YouTube / MP4 / Cloudinary URL"
                  value={note.videoUrl || ""}
                  onChange={(v) => {
                    setField("videoUrl")(v);
                    // ensure we remain in editing mode when user types
                    setEditingNewVideo(true);
                  }}
                  placeholder="https://youtu.be/... or https://.../video.mp4"
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

                {/* live preview while adding/changing (keeps fields visible) */}
                {(note.videoUrl || "").trim() ? (
                  <VideoPreview
                    url={(note.videoUrl || "").trim()}
                    startMs={(startSecs || 0) * 1000}
                    label={note.videoLabel}
                  />
                ) : null}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded shadow bg-black text-white dark:bg-white dark:text-black"
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
