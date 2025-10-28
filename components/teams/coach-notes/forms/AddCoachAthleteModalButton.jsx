// components/teams/coach-notes/forms/AddCoachAthleteModalButton.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalLayout from "@/components/shared/ModalLayout";
import NewCoachAthleteForm from "@/components/teams/coach-notes/forms/NewCoachAthleteForm";

function AddCoachAthleteModalButton({ slug, eventId, className = "" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black ${className}`}
      >
        Add Athlete
      </button>

      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add athlete(s) to this event"
        description="Select existing team members or add a guest."
        withCard
      >
        <NewCoachAthleteForm
          slug={slug}
          eventId={eventId}
          onSuccess={() => {
            // close then refresh to ensure server components re-fetch
            setOpen(false);
            setTimeout(() => {
              try {
                router.refresh();
              } catch {}
            }, 0);
          }}
        />
      </ModalLayout>
    </>
  );
}

export default AddCoachAthleteModalButton;
