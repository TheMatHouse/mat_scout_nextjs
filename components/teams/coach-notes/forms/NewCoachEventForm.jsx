// components/teams/forms/NewCoachEventForm.jsx
"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "react-toastify";

const NewCoachEventForm = ({ slug, onSuccess }) => {
  const router = useRouter();
  const formRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name");
    const startDate = fd.get("startDate");
    const location = fd.get("location") || "";

    try {
      const res = await fetch(`/api/teams/${slug}/coach-notes/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, location }),
      });

      if (!res.ok) {
        let msg = `Failed to create event (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      toast.success("Event created 🎉");
      formRef.current?.reset?.();
      router.refresh(); // refresh the server-rendered events list
      onSuccess?.(); // close the modal
    } catch (err) {
      toast.error(err?.message || "Failed to create event");
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-3"
    >
      <label className="grid gap-1">
        <span className="text-sm">Event name</span>
        <input
          name="name"
          required
          className="px-3 py-2 rounded border bg-transparent"
          placeholder="2025 Denver Classic Judo Championships"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm">Date</span>
        <input
          name="startDate"
          type="date"
          required
          className="px-3 py-2 rounded border bg-transparent"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm">Location (optional)</span>
        <input
          name="location"
          className="px-3 py-2 rounded border bg-transparent"
          placeholder="Denver, CO"
        />
      </label>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="btn-submit"
        >
          Create
        </button>
      </div>
    </form>
  );
};

export default NewCoachEventForm;
