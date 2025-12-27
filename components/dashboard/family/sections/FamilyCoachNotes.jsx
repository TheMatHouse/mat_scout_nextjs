"use client";

import { useCallback, useEffect, useState } from "react";
import NotePreviewModal from "@/components/dashboard/coach-notes/NotePreviewModal";

const TeamCard = ({ children }) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm">
      {children}
    </div>
  );
};

const FamilyCoachNotes = ({ member }) => {
  const memberId = member?._id;
  const userId = member?.userId;

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [noteId, setNoteId] = useState(null);
  const [error, setError] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!memberId || !userId) return;

    setLoading(true);
    setError("");
    try {
      const ts = Date.now();
      const res = await fetch(
        `/api/dashboard/${userId}/family/${memberId}/coach-notes?ts=${ts}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setTeams(Array.isArray(data?.teams) ? data.teams : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load coach notes.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, userId]);

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
      <div className="text-sm text-gray-900 dark:text-gray-100">Loading…</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}{" "}
        <button
          type="button"
          onClick={fetchNotes}
          className="ml-2 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100">
        No coach notes yet.
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
          className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium"
        >
          Refresh
        </button>
      </div>

      <section className="space-y-6">
        {teams.map((t) => (
          <TeamCard key={t.teamId}>
            <div className="px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">{t.teamName}</h3>
            </div>

            <div className="p-4 space-y-5">
              {t.events.map((e) => (
                <div key={e.eventId}>
                  <div className="text-base font-semibold mb-1">
                    {e.eventName}
                  </div>

                  <ul className="ml-4 space-y-2">
                    {e.notes.map((n) => (
                      <li
                        key={n._id}
                        className="text-sm flex justify-between"
                      >
                        <span>- {n.opponent?.name || "Opponent"}</span>
                        <button
                          type="button"
                          onClick={() => openPreview(n._id)}
                          className="text-xs underline"
                        >
                          View
                        </button>
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
        noteId={noteId}
        open={open}
        onClose={closePreview}
      />
    </>
  );
};

export default FamilyCoachNotes;
