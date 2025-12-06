"use client";

import { useState } from "react";
import AddCoachMatchModalButton from "./forms/AddCoachMatchModalButton";
import ModalLayout from "@/components/shared/ModalLayout";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash } from "lucide-react";
import { toast } from "react-toastify";

const CoachMatchList = ({ slug, event, role }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [openModal, setOpenModal] = useState(false);

  const handleDelete = async (matchId) => {
    if (!window.confirm("Delete this match?")) return;

    try {
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${event._id}/matches/${matchId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      toast.success("Match deleted");
      window.location.reload();
    } catch (err) {
      toast.error(err?.message || "Failed to delete match");
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Matches
        </h3>

        {(role === "manager" || role === "coach") && (
          <AddCoachMatchModalButton
            slug={slug}
            eventId={event._id}
            onClick={() => {
              setSelectedMatch(null);
              setOpenModal(true);
            }}
          />
        )}
      </div>

      {/* EMPTY STATE */}
      {!event.matches || event.matches.length === 0 ? (
        <div className="text-gray-700 dark:text-gray-300">
          No matches added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {event.matches.map((m) => (
            <div
              key={m._id}
              className="rounded-xl border bg-[var(--color-card)] p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {m.opponentName || "Match"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {m.notes?.body || ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* VIEW */}
                <button
                  title="View"
                  onClick={() => {
                    setSelectedMatch({ ...m });
                    setOpenModal(true);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-700"
                >
                  <Eye className="w-5 h-5 text-blue-400 dark:text-white" />
                </button>

                {/* EDIT */}
                {(role === "manager" || role === "coach") && (
                  <button
                    title="Edit"
                    onClick={() => {
                      setSelectedMatch({ ...m });
                      setOpenModal(true);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-700"
                  >
                    <Edit className="w-5 h-5 text-green-500" />
                  </button>
                )}

                {/* DELETE */}
                {(role === "manager" || role === "coach") && (
                  <button
                    title="Delete"
                    onClick={() => handleDelete(m._id)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-700"
                  >
                    <Trash className="w-5 h-5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {openModal && (
        <ModalLayout
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          title={selectedMatch ? "Edit Match" : "Add Match"}
          withCard
        >
          <AddCoachMatchModalButton
            slug={slug}
            eventId={event._id}
            match={selectedMatch}
            isEditing={!!selectedMatch}
            onSuccess={() => window.location.reload()}
          />
        </ModalLayout>
      )}
    </div>
  );
};

export default CoachMatchList;
