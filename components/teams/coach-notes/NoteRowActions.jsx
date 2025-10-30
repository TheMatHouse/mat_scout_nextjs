// components/teams/coach-notes/NoteRowActions.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import EditCoachMatchModalButton from "@/components/teams/coach-notes/forms/EditCoachMatchModalButton";
import PreviewAthleteNotesButton from "@/components/teams/coach-notes/PreviewAthleteNotesButton";

export default function NoteRowActions({
  slug,
  eventId,
  entryId,
  matchId,
  initialMatch,
  athleteName,
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches/${matchId}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Note deleted");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* EDIT */}
      <EditCoachMatchModalButton
        slug={slug}
        eventId={eventId}
        entryId={entryId}
        matchId={matchId}
        initialMatch={initialMatch}
        onSaved={() => router.refresh()}
        className="flex items-center justify-center p-1.5 rounded-md hover:bg-amber-500/10 transition-colors"
        title="Edit"
        ariaLabel="Edit"
      />

      {/* PREVIEW (Eye) */}
      <PreviewAthleteNotesButton
        slug={slug}
        eventId={eventId}
        entryId={entryId}
        noteId={matchId}
        note={initialMatch}
        athleteName={athleteName || "Athlete"}
        renderTrigger={({ onOpen }) => (
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center justify-center p-1.5 rounded-md hover:bg-blue-600/10 transition-colors"
            title="Preview"
            aria-label="Preview"
          >
            <Eye className="w-5 h-5 text-blue-500" />
          </button>
        )}
      />

      {/* DELETE */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
          deleting
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-red-600/10 active:bg-red-600/20"
        }`}
        title="Delete"
        aria-label="Delete"
      >
        <Trash2 className="w-5 h-5 text-red-500" />
      </button>
    </div>
  );
}
