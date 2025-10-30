// components/dashboard/coach-notes/UserCoachNotesSection.jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import NotePreviewModal from "./NotePreviewModal";

function TeamCard({ children }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm">
      {children}
    </div>
  );
}

const UserCoachNotesSection = ({ userId }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [noteId, setNoteId] = useState(null);
  const [error, setError] = useState("");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ts = Date.now();
      const res = await fetch(`/api/dashboard/${userId}/coach-notes?ts=${ts}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const arr = Array.isArray(data?.teams) ? data.teams : [];
      setTeams(arr);
    } catch (e) {
      console.error(e);
      setError("Failed to load coach notes.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const openPreview = (id) => {
    setNoteId(id);
    setOpen(true);
  };
  const closePreview = () => {
    setOpen(false);
    setNoteId(null);
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100/80">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}{" "}
        <button
          type="button"
          onClick={fetchNotes}
          className="ml-2 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100/80">
        No coach notes yet.{" "}
        <button
          type="button"
          onClick={fetchNotes}
          className="ml-1 underline hover:no-underline"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Coach Notes
        </h2>
        <button
          type="button"
          onClick={fetchNotes}
          className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      <section className="space-y-6">
        {teams.map((t, idxTeam) => (
          <TeamCard key={t.teamId || t.teamSlug || idxTeam}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t.teamName || "Team"}
              </h3>
            </div>

            <div className="p-4 space-y-5">
              {(t.events
                ? t.events
                : [{ eventName: null, notes: t.notes || [] }]
              ).map((e, idxEvent) => (
                <div key={e.eventId || e.eventName || idxEvent}>
                  {e.eventName ? (
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {e.eventName}
                    </div>
                  ) : null}

                  <ul className="mt-1 ml-4 space-y-2">
                    {(e.notes || []).map((n) => {
                      const opponent = n.opponent?.name || n.opponentName || "";
                      const coach = n.coachName || "Coach";
                      return (
                        <li
                          key={n._id}
                          className="text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2"
                        >
                          <div className="text-gray-900 dark:text-gray-100/90">
                            - {opponent ? `${opponent} ` : ""}
                            <span className="opacity-80">— notes by</span>{" "}
                            {coach}
                          </div>
                          <div className="mt-1 sm:mt-0">
                            <button
                              type="button"
                              onClick={() => openPreview(n._id)}
                              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              View
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </TeamCard>
        ))}
      </section>

      <NotePreviewModal
        userId={userId}
        noteId={noteId}
        open={open}
        onClose={closePreview}
      />
    </>
  );
};

export default UserCoachNotesSection;
