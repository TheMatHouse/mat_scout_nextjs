// components/teams/forms/AddCoachEventModalButton.jsx
"use client";

import { useState, useCallback } from "react";
import ModalLayout from "@/components/shared/ModalLayout";
import NewCoachEventForm from "./NewCoachEventForm";
import { Plus } from "lucide-react";

const AddCoachEventModalButton = ({ slug }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const onSuccess = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-add"
      >
        <Plus size={16} /> Add Event
      </button>

      <ModalLayout
        isOpen={open}
        onClose={setOpen}
        title="Add Event"
        description="Create a new event for Coach’s Notes."
        withCard
      >
        <NewCoachEventForm
          slug={slug}
          onSuccess={onSuccess}
        />
      </ModalLayout>
    </>
  );
};

export default AddCoachEventModalButton;
