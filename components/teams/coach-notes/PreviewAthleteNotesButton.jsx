// components/teams/coach-notes/PreviewAthleteNotesButton.jsx
"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import ViewAthleteNotesModal from "@/components/teams/coach-notes/ViewAthleteNotesModal";

export default function PreviewAthleteNotesButton({
  slug,
  eventId,
  entryId,
  noteId, // matchId
  note, // initialMatch
  athleteName = "Athlete",
  renderTrigger, // optional: ({ onOpen }) => JSX
}) {
  const [open, setOpen] = useState(false);

  const DefaultTrigger = ({ onOpen }) => (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center justify-center p-1.5 rounded-md hover:bg-blue-600/10 transition-colors"
      title="Preview"
      aria-label="Preview"
    >
      <Eye className="w-5 h-5 text-blue-500" />
    </button>
  );

  const Trigger = renderTrigger ?? DefaultTrigger;

  return (
    <>
      <Trigger onOpen={() => setOpen(true)} />
      {open && (
        <ViewAthleteNotesModal
          isOpen={open}
          onClose={() => setOpen(false)}
          slug={slug}
          eventId={eventId}
          entryId={entryId}
          noteId={noteId}
          note={note}
          athleteName={athleteName}
        />
      )}
    </>
  );
}
