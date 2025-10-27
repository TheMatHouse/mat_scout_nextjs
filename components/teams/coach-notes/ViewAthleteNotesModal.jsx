// components/teams/coach-notes/ViewAthleteNotesModal.jsx
"use client";

import { useEffect, useState } from "react";
import ModalLayout from "@/components/shared/ModalLayout";

const toStr = (v) => (v == null ? "" : String(v));

const serializeNote = (n = {}) => {
  const opp = n?.opponent || {};
  const tech = n?.techniques || {};
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

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!isOpen || data || !slug || !eventId || !entryId || !noteId) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const Section = ({ title, children }) => (
    <section className="grid gap-2">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-1">
        {title}
      </h4>
      <div className="text-sm text-gray-900 dark:text-gray-100/80 whitespace-pre-wrap">
        {children || "—"}
      </div>
    </section>
  );

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Preview Match / Note"
      description={athleteName ? `Notes for ${athleteName}` : undefined}
      withCard
    >
      {loading ? (
        <div className="p-4 text-sm text-gray-900 dark:text-gray-100 opacity-80">
          Loading…
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : data ? (
        <div className="space-y-5">
          {/* Opponent Info */}
          <Section title="Opponent">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {data.opponent.firstName || data.opponent.lastName
                ? `${data.opponent.firstName} ${data.opponent.lastName}`.trim()
                : data.opponent.name || "—"}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {[data.opponent.rank, data.opponent.club, data.opponent.country]
                .filter(Boolean)
                .join(" • ")}
            </div>
          </Section>

          {/* Result */}
          <Section title="Result">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {data.result ? data.result.toUpperCase() : "—"}
            </span>
            {data.result && data.score ? " • " : ""}
            {data.score && (
              <span className="text-gray-900 dark:text-gray-100/80">
                {data.score}
              </span>
            )}
          </Section>

          {/* Key Notes */}
          <Section title="What Went Well">{data.whatWentWell}</Section>
          <Section title="Reinforce">{data.reinforce}</Section>
          <Section title="Needs Fix">{data.needsFix}</Section>

          {/* Techniques */}
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

          {/* Additional Notes */}
          <Section title="Additional Notes">{data.notes}</Section>

          {/* Footer */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-900 dark:text-gray-100 opacity-80">
          No data.
        </div>
      )}
    </ModalLayout>
  );
};

export default ViewAthleteNotesModal;
