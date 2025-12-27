"use client";

import { useEffect, useState } from "react";
import ModalLayout from "@/components/shared/ModalLayout";

const toStr = (v) => (v == null ? "" : String(v));

/* ---------- video helpers ---------- */
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

/* ---------- normalize note ---------- */
const serializeNote = (n = {}) => {
  const opp = n?.opponent || {};
  const tech = n?.techniques || {};
  const vid = n?.video || {};

  return {
    opponent: {
      firstName: toStr(opp.firstName),
      lastName: toStr(opp.lastName),
      name: toStr(opp.name),
      rank: toStr(opp.rank),
      club: toStr(opp.club),
      country: toStr(opp.country),
    },
    result: toStr(n.result),
    score: toStr(n.score),
    whatWentWell: toStr(n.whatWentWell),
    reinforce: toStr(n.reinforce),
    needsFix: toStr(n.needsFix),
    notes: toStr(n.notes),
    techniques: {
      ours: Array.isArray(tech.ours) ? tech.ours.map(toStr) : [],
      theirs: Array.isArray(tech.theirs) ? tech.theirs.map(toStr) : [],
    },
    video: {
      url: toStr(vid.url),
      label: toStr(vid.label),
      startMs: Number(vid.startMs || 0),
    },
    createdAt: n?.createdAt ? new Date(n.createdAt).toISOString() : "",
    updatedAt: n?.updatedAt ? new Date(n.updatedAt).toISOString() : "",
  };
};

const ViewAthleteNotesModal = ({
  isOpen,
  onClose,
  slug,
  eventId,
  entryId,
  noteId,
  note,
  athleteName = "Athlete",
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(note ? serializeNote(note) : null);
  const [error, setError] = useState("");

  // Keep local state in sync if parent passes a different note
  useEffect(() => {
    setData(note ? serializeNote(note) : null);
  }, [note]);

  // ✅ Always fetch the full match note on open (because list notes often omit +video)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!isOpen || !slug || !eventId || !entryId || !noteId) return;

      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${noteId}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.match) {
          throw new Error(json?.error || "Failed to load note");
        }

        if (!alive) return;
        setData(serializeNote(json.match));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load note");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [isOpen, slug, eventId, entryId, noteId]);

  const Section = ({ title, children }) => (
    <section className="grid gap-2">
      <h4 className="font-semibold border-b pb-1">{title}</h4>
      <div className="text-sm whitespace-pre-wrap">{children || "—"}</div>
    </section>
  );

  const ytId = extractYouTubeId(data?.video?.url);
  const startSeconds = Math.floor((data?.video?.startMs || 0) / 1000);
  const embedUrl = ytId ? toYouTubeEmbed(ytId, startSeconds) : "";

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Preview Match / Note"
      description={athleteName ? `Notes for ${athleteName}` : undefined}
      withCard
      size="xl"
    >
      {loading ? (
        <div className="p-4 text-sm opacity-80">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT COLUMN — TEXT */}
          <div className="space-y-5">
            <Section title="Opponent">
              <div className="font-medium">
                {data.opponent.firstName || data.opponent.lastName
                  ? `${data.opponent.firstName} ${data.opponent.lastName}`.trim()
                  : data.opponent.name || "—"}
              </div>
              <div className="text-xs opacity-70">
                {[data.opponent.rank, data.opponent.club, data.opponent.country]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            </Section>

            <Section title="Result">
              {data.result ? data.result.toUpperCase() : "—"}
              {data.score ? ` • ${data.score}` : ""}
            </Section>

            <Section title="What Went Well">{data.whatWentWell}</Section>
            <Section title="Reinforce">{data.reinforce}</Section>
            <Section title="Needs Fix">{data.needsFix}</Section>

            <div className="grid gap-5 sm:grid-cols-2">
              <Section title="Techniques (Ours)">
                {data.techniques.ours.length
                  ? data.techniques.ours.join(", ")
                  : "—"}
              </Section>
              <Section title="Techniques (Theirs)">
                {data.techniques.theirs.length
                  ? data.techniques.theirs.join(", ")
                  : "—"}
              </Section>
            </div>

            <Section title="Additional Notes">{data.notes}</Section>
          </div>

          {/* RIGHT COLUMN — VIDEO */}
          <div>
            <section className="rounded-xl border p-4 space-y-3">
              <h4 className="text-xs uppercase tracking-wide opacity-60">
                Video
              </h4>

              {data.video.url.trim() ? (
                embedUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden border bg-black">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title="Match video"
                    />
                  </div>
                ) : (
                  <a
                    href={data.video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
                  >
                    Watch video
                  </a>
                )
              ) : (
                <div className="text-sm opacity-60 italic">
                  No video attached
                </div>
              )}

              {data.video.label && (
                <div className="text-sm opacity-80">{data.video.label}</div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm opacity-80">No data.</div>
      )}

      <div className="pt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </ModalLayout>
  );
};

export default ViewAthleteNotesModal;
