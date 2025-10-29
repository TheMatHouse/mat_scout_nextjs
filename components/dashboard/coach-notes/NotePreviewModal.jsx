// components/dashboard/coach-notes/NotePreviewModal.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function Block({ title, children }) {
  if (!children) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </div>
      <div className="text-sm text-gray-900 dark:text-gray-100">{children}</div>
    </div>
  );
}

export default function NotePreviewModal({ userId, noteId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState("");
  const escBound = useRef(false);

  useEffect(() => {
    if (!open || !noteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setNote(null);
      try {
        const res = await fetch(
          `/api/dashboard/${userId}/coach-notes/${noteId}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setNote(data?.note || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load note.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, noteId, userId]);

  useEffect(() => {
    if (!open || escBound.current) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    escBound.current = true;
    return () => {
      window.removeEventListener("keydown", onKey);
      escBound.current = false;
    };
  }, [open, onClose]);

  if (!open) return null;

  const fmtDateTime = (d) => {
    try {
      return d ? new Date(d).toLocaleString() : "";
    } catch {
      return String(d || "");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* sheet on mobile; centered card on desktop */}
      <div
        className="relative z-[101] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl 
                      bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700
                      sm:m-0 sm:my-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 sm:rounded-t-2xl">
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {note?.team?.teamName || "Coach’s Note"}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              {note?.event?.name ? `${note.event.name} • ` : ""}
              {fmtDateTime(note?.createdAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              Loading…
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !note ? (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              No data.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-medium">Athlete:</span> {note.athleteName}
                {note.opponent?.name && (
                  <>
                    {" "}
                    • <span className="font-medium">Opponent:</span>{" "}
                    {note.opponent.name}
                  </>
                )}
                {note.result && (
                  <>
                    {" "}
                    • <span className="font-medium">Result:</span> {note.result}
                  </>
                )}
                {note.score && (
                  <>
                    {" "}
                    • <span className="font-medium">Score:</span> {note.score}
                  </>
                )}
              </div>

              <Block title="What Went Well">
                {note.whatWentWell && (
                  <p className="whitespace-pre-wrap">{note.whatWentWell}</p>
                )}
              </Block>

              <Block title="Reinforce">
                {note.reinforce && (
                  <p className="whitespace-pre-wrap">{note.reinforce}</p>
                )}
              </Block>

              <Block title="Needs Fix">
                {note.needsFix && (
                  <p className="whitespace-pre-wrap">{note.needsFix}</p>
                )}
              </Block>

              {(note.techniques?.ours?.length ||
                note.techniques?.theirs?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {note.techniques.ours?.length ? (
                    <Block title="Our Techniques">
                      <ul className="list-disc pl-5 space-y-1">
                        {note.techniques.ours.map((t, i) => (
                          <li key={`o-${i}`}>{t}</li>
                        ))}
                      </ul>
                    </Block>
                  ) : null}
                  {note.techniques.theirs?.length ? (
                    <Block title="Their Techniques">
                      <ul className="list-disc pl-5 space-y-1">
                        {note.techniques.theirs.map((t, i) => (
                          <li key={`t-${i}`}>{t}</li>
                        ))}
                      </ul>
                    </Block>
                  ) : null}
                </div>
              )}

              {note.notes && (
                <Block title="Additional Notes">
                  <p className="whitespace-pre-wrap">{note.notes}</p>
                </Block>
              )}

              <div className="pt-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="font-medium">Notes by:</span>{" "}
                {note.coachName || "Coach"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
