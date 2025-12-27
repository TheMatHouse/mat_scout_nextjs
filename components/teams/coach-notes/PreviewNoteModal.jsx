"use client";

import { useEffect, useMemo, useState } from "react";
import ModalLayout from "@/components/shared/ModalLayout";

/* ---------- helpers ---------- */
const cls = (...a) => a.filter(Boolean).join(" ");

const resultBadge = (result) => {
  const r = String(result || "").toLowerCase();
  const base =
    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
  if (r === "win")
    return <span className={cls(base, "bg-emerald-600 text-white")}>Win</span>;
  if (r === "loss")
    return <span className={cls(base, "bg-rose-600 text-white")}>Loss</span>;
  if (r === "draw")
    return <span className={cls(base, "bg-zinc-600 text-white")}>Draw</span>;
  return null;
};

const countryFlag = (code) =>
  code ? (
    <span className="ml-1 text-[10px] tracking-widest uppercase opacity-70">
      {code}
    </span>
  ) : null;

/* ---------- video helpers (CORRECT SHAPE) ---------- */
const getVideo = (n) => n?.video || null;

const extractYouTubeId = (url = "") => {
  if (!url) return null;
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^&?/]+)/i;
  const m = url.match(re);
  return m ? m[1] : null;
};

const toYouTubeEmbed = (id, startSeconds = 0) =>
  id
    ? `https://www.youtube.com/embed/${id}${
        startSeconds > 0 ? `?start=${startSeconds}` : ""
      }`
    : "";

/* ---------- main ---------- */
const PreviewNoteModal = ({
  open,
  onClose,
  slug,
  eventId,
  entryId,
  noteId,
  note,
  athleteName = "Athlete",
}) => {
  const [loading, setLoading] = useState(false);
  const [stateNote, setStateNote] = useState(note || null);
  const [error, setError] = useState("");

  useEffect(() => {
    setStateNote(note || null);
  }, [note]);

  useEffect(() => {
    if (!open || note || !slug || !eventId || !entryId || !noteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${noteId}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setStateNote(data.match);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load note");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, slug, eventId, entryId, noteId, note]);

  const n = stateNote;
  const opp = n?.opponent || {};
  const video = getVideo(n);

  const ytId = extractYouTubeId(video?.url);
  const startSeconds = Math.floor((video?.startMs || 0) / 1000);
  const embedUrl = ytId ? toYouTubeEmbed(ytId, startSeconds) : "";

  return (
    <ModalLayout
      isOpen={open}
      onClose={onClose}
      title={`Preview • ${athleteName}`}
      description="Read-only view of this match note."
      withCard
    >
      {loading ? (
        <div className="py-8">Loading…</div>
      ) : error ? (
        <div className="py-8 text-red-600">{error}</div>
      ) : !n ? (
        <div className="py-8">No note found.</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="text-base font-semibold">
              {opp.name || "Opponent"}
              {countryFlag(opp.country)}
            </div>
            <div className="text-sm opacity-80">
              {[opp.rank, opp.club].filter(Boolean).join(" • ")}
            </div>
            <div className="text-xs opacity-60">
              {n.createdAt && new Date(n.createdAt).toLocaleString()}
            </div>
          </div>

          {(n.result || n.score) && (
            <div className="flex gap-2">
              {resultBadge(n.result)}
              {n.score && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-200 dark:bg-zinc-700">
                  Score: {n.score}
                </span>
              )}
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* LEFT */}
            <div className="space-y-4">
              TESTING
              {n.whatWentWell && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-2">
                    What went well
                  </h4>
                  {n.whatWentWell}
                </section>
              )}
              {n.reinforce && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-2">
                    What we should reinforce
                  </h4>
                  {n.reinforce}
                </section>
              )}
              {n.needsFix && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-2">
                    What we need to fix
                  </h4>
                  {n.needsFix}
                </section>
              )}
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              {(n.techniques?.ours?.length || n.techniques?.theirs?.length) && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-3">
                    Techniques
                  </h4>

                  {n.techniques.ours?.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs uppercase opacity-60 mb-1">
                        Ours
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.techniques.ours.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded bg-emerald-600/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {n.techniques.theirs?.length > 0 && (
                    <div>
                      <div className="text-xs uppercase opacity-60 mb-1">
                        Theirs
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.techniques.theirs.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded bg-zinc-500/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {n.notes && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-2">
                    More notes
                  </h4>
                  <div className="whitespace-pre-wrap">{n.notes}</div>
                </section>
              )}

              {video?.url && (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase opacity-60 mb-2">Video</h4>
                  {embedUrl ? (
                    <div className="aspect-video rounded overflow-hidden border">
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
                    >
                      Watch video
                    </a>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalLayout>
  );
};

export default PreviewNoteModal;
