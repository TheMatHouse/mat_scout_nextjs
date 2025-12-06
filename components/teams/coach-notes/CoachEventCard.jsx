"use client";

import { useState } from "react";
import ModalLayout from "@/components/shared/ModalLayout";
import AddCoachMatchModalButton from "./forms/AddCoachMatchModalButton";
import CoachMatchList from "./CoachMatchList";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "react-toastify";

/* -------------------------------------------------------------
   CARD COMPONENT (arrow function + separate export)
------------------------------------------------------------- */
const CoachEventCard = ({ event, slug }) => {
  const [open, setOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Delete this event and ALL notes under it?")) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${event._id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event deleted");
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 bg-[var(--color-card)] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {event.eventName}
        </h3>

        <div className="flex gap-2">
          <AddCoachMatchModalButton
            eventId={event._id}
            slug={slug}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="hover:bg-red-600/20"
            title="Delete event"
          >
            <Trash className="w-5 h-5 text-red-500" />
          </Button>
        </div>
      </div>

      {/* MATCH LIST */}
      <CoachMatchList matches={event.matches || []} />

      {/* EVENT DETAILS MODAL */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title={event.eventName}
        withCard
      >
        <div className="space-y-3">
          <p className="text-gray-800 dark:text-gray-200">
            {event.notes?.body || ""}
          </p>
        </div>
      </ModalLayout>
    </div>
  );
};

export default CoachEventCard;
