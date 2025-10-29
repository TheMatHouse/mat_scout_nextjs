// components/dashboard/coach-notes/UserCoachNotesSection.jsx
"use client";

import { useEffect, useState } from "react";
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

  const openPreview = (id) => {
    setNoteId(id);
    setOpen(true);
  };
  const closePreview = () => {
    setOpen(false);
    setNoteId(null);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/${userId}/coach-notes`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setTeams(Array.isArray(data?.teams) ? data.teams : []);
      } catch (e) {
        console.error(e);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100/80">
        Loading…
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100/80">
        No coach notes yet.
      </div>
    );
  }

  return (
    <>
      <section className="space-y-6">
        {teams.map((t) => (
          <TeamCard key={t.teamId || t.teamSlug || "team"}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t.teamName || "Team"}
              </h3>
            </div>

            {/* If your list route returns events[], render grouped; else fallback to flat notes[] */}
            <div className="p-4 space-y-5">
              {(t.events
                ? t.events
                : [{ eventName: null, notes: t.notes || [] }]
              ).map((e, idx) => (
                <div key={e.eventId || e.eventName || idx}>
                  {e.eventName ? (
                    <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {e.eventName}
                    </div>
                  ) : null}

                  <ul className="mt-1 ml-4 space-y-2">
                    {(e.notes || []).map((n) => (
                      <li
                        key={n._id}
                        className="text-sm flex flex-col sm:flex-row sm:items-center sm:gap-2"
                      >
                        <div className="text-gray-900 dark:text-gray-100/90">
                          - {n.opponentName ? `${n.opponentName} ` : ""}
                          <span className="opacity-80">— notes by</span>{" "}
                          {n.coachName || "Coach"}
                        </div>
                        <div className="mt-1 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => openPreview(n._id)}
                            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 px-2.5 py-1 text-xs font-medium
                                       text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            View
                          </button>
                        </div>
                      </li>
                    ))}
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
