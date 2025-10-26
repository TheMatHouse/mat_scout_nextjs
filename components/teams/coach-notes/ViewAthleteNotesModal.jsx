// components/teams/coach-notes/ViewAthleteNotesModal.jsx
"use client";

import { useEffect, useState } from "react";
import ModalLayout from "@/components/shared/ModalLayout";

const ViewAthleteNotesModal = ({
  open,
  onClose,
  slug,
  entryId,
  athleteName,
}) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/entries/${entryId}/matches?ts=${Date.now()}`,
          {
            cache: "no-store",
          }
        );
        const j = await res.json().catch(() => ({}));
        if (!ignore) setNotes(j.notes || []);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [open, slug, entryId]);

  return (
    <ModalLayout
      isOpen={open}
      onClose={onClose}
      title={`Notes: ${athleteName || "Athlete"}`}
      description="All saved match notes for this athlete."
      withCard
    >
      {loading ? (
        <div className="p-3 text-sm opacity-80">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="p-3 text-sm opacity-80">No notes yet.</div>
      ) : (
        <div className="grid gap-3">
          {notes.map((n) => (
            <div
              key={n._id}
              className="rounded-xl border p-3"
            >
              <div className="text-sm opacity-80">
                {n.opponent?.name ? (
                  <>
                    vs <span className="font-medium">{n.opponent.name}</span>
                  </>
                ) : (
                  "Match"
                )}
                {n.result ? ` • ${n.result.toUpperCase()}` : ""}
                {n.score ? ` • ${n.score}` : ""}
              </div>

              {n.whatWentWell && (
                <div className="mt-2">
                  <span className="text-xs uppercase opacity-60">
                    Went well:
                  </span>{" "}
                  <div>{n.whatWentWell}</div>
                </div>
              )}
              {n.reinforce && (
                <div className="mt-2">
                  <span className="text-xs uppercase opacity-60">
                    Reinforce:
                  </span>{" "}
                  <div>{n.reinforce}</div>
                </div>
              )}
              {n.needsFix && (
                <div className="mt-2">
                  <span className="text-xs uppercase opacity-60">
                    Needs fix:
                  </span>{" "}
                  <div>{n.needsFix}</div>
                </div>
              )}

              {(n.techniques?.ours?.length || n.techniques?.theirs?.length) && (
                <div className="mt-2 text-sm">
                  {n.techniques?.ours?.length ? (
                    <div>
                      <span className="text-xs uppercase opacity-60">
                        Ours:
                      </span>{" "}
                      {n.techniques.ours.join(", ")}
                    </div>
                  ) : null}
                  {n.techniques?.theirs?.length ? (
                    <div>
                      <span className="text-xs uppercase opacity-60">
                        Theirs:
                      </span>{" "}
                      {n.techniques.theirs.join(", ")}
                    </div>
                  ) : null}
                </div>
              )}

              {n.notes && (
                <div className="mt-2">
                  <span className="text-xs uppercase opacity-60">Notes:</span>{" "}
                  <div>{n.notes}</div>
                </div>
              )}
              <div className="mt-2 text-xs opacity-60">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalLayout>
  );
};

export default ViewAthleteNotesModal;
