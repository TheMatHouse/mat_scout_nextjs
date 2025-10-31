// components/teams/coach-notes/RemoveEntryButton.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";

function RemoveEntryButton({
  slug,
  eventId,
  entryId,
  cascadeChoice = "ask", // "ask" | "none" | "notes"
  className = "",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    let cascade = "none";

    if (cascadeChoice === "ask") {
      const choice = window.prompt(
        'Remove athlete from this event.\n\nType one of:\n- "keep" to keep their notes\n- "notes" to also remove their notes\n\nCancel to abort.'
      );
      if (choice === null) return;
      cascade = choice.trim().toLowerCase() === "notes" ? "notes" : "none";
    } else {
      cascade = cascadeChoice === "notes" ? "notes" : "none";
    }

    try {
      setBusy(true);
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}?cascade=${cascade}`,
        { method: "DELETE" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      toast.success(
        j?.message ||
          (cascade === "notes"
            ? "Athlete and notes removed."
            : "Athlete removed.")
      );
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Failed to remove athlete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`px-3 py-1.5 rounded-md border hover:bg-red-600/10 text-red-600 flex items-center gap-1 ${className}`}
      title="Remove athlete"
      aria-label="Remove athlete"
    >
      <Trash2 className="w-4 h-4" />
      Remove
    </button>
  );
}

export default RemoveEntryButton;
