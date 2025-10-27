// components/teams/coach-notes/PreviewNoteModal.jsx
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

const prettyScore = (score) => (score ? String(score) : "");

const countryFlag = (code) => {
  if (!code) return null;
  // lightweight fallback: just show the code; your app may already have flags
  return (
    <span className="ml-1 text-[10px] tracking-widest uppercase opacity-70">
      {code}
    </span>
  );
};

const pickVideoUrl = (n) => {
  // Accept several shapes to be forgiving
  return (
    n?.videoUrl || n?.video || n?.media?.videoUrl || n?.media?.video?.url || ""
  );
};

const isEmbeddable = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(u.hostname);
  } catch {
    return false;
  }
};

const toYouTubeEmbed = (url) => {
  try {
    const u = new URL(url);
    if (/youtu\.be/i.test(u.hostname)) {
      // https://youtu.be/<id>
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (/youtube\.com/i.test(u.hostname)) {
      // https://www.youtube.com/watch?v=<id>
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      // already an embed or shorts?
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        const id2 = u.pathname.split("/")[2];
        if (id2) return `https://www.youtube.com/embed/${id2}`;
      }
    }
  } catch {}
  return url; // as-is
};

const toVimeoEmbed = (url) => {
  try {
    const u = new URL(url);
    if (/vimeo\.com/i.test(u.hostname)) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return url;
};

const toEmbedUrl = (url) => {
  if (!url) return "";
  if (/youtu/i.test(url)) return toYouTubeEmbed(url);
  if (/vimeo/i.test(url)) return toVimeoEmbed(url);
  return url;
};

/* ---------- main ---------- */
const PreviewNoteModal = ({
  open,
  onClose,
  slug,
  eventId,
  entryId,
  noteId,
  note, // preloaded/current note
  athleteName = "Athlete",
}) => {
  const [loading, setLoading] = useState(false);
  const [stateNote, setStateNote] = useState(note || null);
  const [error, setError] = useState("");

  // Keep local state in sync when parent passes a new note (after edit)
  useEffect(() => {
    setStateNote(note || null);
  }, [note]);

  // Only fetch if we don't already have the note passed in
  useEffect(() => {
    if (!open) return;
    if (note) return; // we already have fresh data from parent
    if (!slug || !eventId || !entryId || !noteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${noteId}`,
          { method: "GET", cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const pulled = data?.note || data;
        if (!cancelled) setStateNote(pulled);
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

  const n = stateNote || note;

  const oppName = useMemo(() => {
    const opp = n?.opponent || {};
    if (opp.firstName || opp.lastName) {
      return `${opp.firstName || ""} ${opp.lastName || ""}`.trim();
    }
    return opp.name || "Opponent";
  }, [n]);

  const oppMeta = useMemo(() => {
    const opp = n?.opponent || {};
    const bits = [opp.rank, opp.club].filter(Boolean);
    return bits.join(" • ");
  }, [n]);

  const videoUrl = pickVideoUrl(n);
  const showEmbed = isEmbeddable(videoUrl);
  const embedUrl = showEmbed ? toEmbedUrl(videoUrl) : "";

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
          <div className="flex flex-col gap-1">
            <div className="text-base font-semibold">
              {oppName}
              {countryFlag(n?.opponent?.country)}
            </div>
            {oppMeta ? (
              <div className="text-sm opacity-80">{oppMeta}</div>
            ) : null}
            <div className="text-xs opacity-60">
              {n?.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
            </div>
          </div>

          {/* Badges Row */}
          {(n?.result || n?.score) && (
            <div className="flex flex-wrap items-center gap-2">
              {resultBadge(n?.result)}
              {n?.score ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100">
                  Score: {prettyScore(n.score)}
                </span>
              ) : null}
            </div>
          )}

          {/* Two-column content grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              {n?.whatWentWell ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-2">
                    What went well
                  </h4>
                  <div className="leading-relaxed">{n.whatWentWell}</div>
                </section>
              ) : null}

              {n?.reinforce ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-2">
                    What we should reinforce
                  </h4>
                  <div className="leading-relaxed">{n.reinforce}</div>
                </section>
              ) : null}

              {n?.needsFix ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-2">
                    What we need to fix
                  </h4>
                  <div className="leading-relaxed">{n.needsFix}</div>
                </section>
              ) : null}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {n?.techniques?.ours?.length || n?.techniques?.theirs?.length ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-3">
                    Techniques
                  </h4>

                  {n?.techniques?.ours?.length ? (
                    <div className="mb-3">
                      <div className="text-xs uppercase opacity-60 mb-1">
                        Ours
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.techniques.ours.map((t, i) => (
                          <span
                            key={`o-${i}`}
                            className="px-2 py-1 rounded-md text-xs bg-emerald-600/10 text-emerald-800 dark:text-emerald-100"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {n?.techniques?.theirs?.length ? (
                    <div>
                      <div className="text-xs uppercase opacity-60 mb-1">
                        Theirs
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.techniques.theirs.map((t, i) => (
                          <span
                            key={`t-${i}`}
                            className="px-2 py-1 rounded-md text-xs bg-zinc-500/10 text-zinc-800 dark:text-zinc-100"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {n?.notes ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-2">
                    More notes
                  </h4>
                  <div className="leading-relaxed whitespace-pre-wrap">
                    {n.notes}
                  </div>
                </section>
              ) : null}

              {/* Video */}
              {videoUrl ? (
                <section className="rounded-xl border p-4">
                  <h4 className="text-xs uppercase tracking-wide opacity-60 mb-2">
                    Video
                  </h4>
                  {showEmbed ? (
                    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                      <iframe
                        src={embedUrl}
                        title="Match video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  ) : (
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
                    >
                      Watch video
                    </a>
                  )}
                </section>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </ModalLayout>
  );
};

export default PreviewNoteModal;
