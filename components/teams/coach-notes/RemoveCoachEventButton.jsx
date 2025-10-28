"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "react-toastify";

/**
 * cascadeChoice:
 *  - "ask"     → prompt: keep / entries / notes
 *  - "none"    → delete event only
 *  - "entries" → also remove all entries for this event (soft delete)
 *  - "notes"   → remove entries + their match notes (soft delete)
 */
function RemoveCoachEventButton({
  slug,
  eventId,
  cascadeChoice = "ask",
  className = "",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    let cascade = "none";

    if (cascadeChoice === "ask") {
      const choice = window.prompt(
        'Delete this event.\n\nType one of:\n- "keep"     → delete event only\n- "entries"  → also remove all athletes (entries)\n- "notes"    → remove athletes AND their notes\n\nCancel to abort.'
      );
      if (choice === null) return;
      const v = choice.trim().toLowerCase();
      cascade = v === "entries" ? "entries" : v === "notes" ? "notes" : "none";
    } else {
      cascade =
        cascadeChoice === "entries"
          ? "entries"
          : cascadeChoice === "notes"
          ? "notes"
          : "none";
    }

    try {
      setBusy(true);
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}?cascade=${cascade}`,
        { method: "DELETE" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);

      toast.success(j?.message || "Event deleted.");
      router.refresh();
    } catch (e) {
      toast.error(e.message || "Failed to delete event");
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
      title="Delete event"
      aria-label="Delete event"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  );
}

export default RemoveCoachEventButton;
