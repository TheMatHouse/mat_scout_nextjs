// components/teams/forms/AddCoachAthleteModalButton.jsx
"use client";

import { useState, useCallback } from "react";
import ModalLayout from "@/components/shared/ModalLayout";
import NewCoachAthleteForm from "./NewCoachAthleteForm";

const AddCoachAthleteModalButton = ({ slug, eventId }) => {
  const [open, setOpen] = useState(false);
  const onSuccess = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black"
      >
        Add Athlete
      </button>

      <ModalLayout
        isOpen={open}
        onClose={setOpen}
        title="Add Athlete"
        description="Select a team member or add a guest athlete."
        withCard
      >
        <NewCoachAthleteForm
          slug={slug}
          eventId={eventId}
          onSuccess={onSuccess}
        />
      </ModalLayout>
    </>
  );
};

export default AddCoachAthleteModalButton;
