// components/teams/coach-notes/AthleteCard.jsx
"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import AddCoachMatchModalButton from "@/components/teams/coach-notes/forms/AddCoachMatchModalButton";
import ViewAthleteNotesModal from "./ViewAthleteNotesModal";

const AthleteCard = ({ slug, entry, showDelete = true }) => {
  const router = useRouter();
  const [openView, setOpenView] = useState(false);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Remove ${entry.athlete?.name || "athlete"} from this event?`
      )
    )
      return;
    try {
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/entries/${entry._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || j?.message || "Delete failed");
      toast.success("Athlete removed");
      router.refresh();
    } catch (e) {
      toast.error(e?.message || "Failed to remove athlete");
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{entry.athlete?.name}</div>
          <div className="text-sm opacity-80">
            {[entry.athlete?.club, entry.athlete?.country]
              .filter(Boolean)
              .join(" • ")}
          </div>
        </div>

        <div className="flex gap-2">
          AddCoachMatchModalButton
          <button
            onClick={() => setOpenView(true)}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-zinc-800"
          >
            Preview Notes
          </button>
          {showDelete && (
            <button
              onClick={handleDelete}
              className="px-3 py-1 rounded bg-red-600 text-white"
              title="Manager only"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <ViewAthleteNotesModal
        open={openView}
        onClose={setOpenView}
        slug={slug}
        entryId={entry._id}
        athleteName={entry.athlete?.name}
      />
    </div>
  );
};

export default AthleteCard;
