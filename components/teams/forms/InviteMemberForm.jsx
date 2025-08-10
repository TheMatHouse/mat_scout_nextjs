// components/teams/forms/InviteMemberForm.jsx
"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";

export default function InviteMemberForm({ slug, setOpen, onSuccess }) {
  const [role, setRole] = useState("member"); // member | coach | manager
  const [isMinor, setIsMinor] = useState(false);

  // Invitee
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Parent (for minors)
  const [pFirst, setPFirst] = useState("");
  const [pLast, setPLast] = useState("");
  const [pEmail, setPEmail] = useState("");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = [
    { value: "member", label: "Member" },
    { value: "coach", label: "Coach" },
    { value: "manager", label: "Manager" },
  ];

  async function onSubmit(e) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please provide the invitee’s first and last name.");
      return;
    }
    if (!isMinor && !email.trim()) {
      toast.error("Please provide the invitee’s email.");
      return;
    }
    if (isMinor && !pEmail.trim()) {
      toast.error("Please provide the parent’s email.");
      return;
    }

    const payload = isMinor
      ? {
          isMinor: true,
          role,
          inviteeFirstName: firstName.trim(),
          inviteeLastName: lastName.trim(),
          parentFirstName: pFirst.trim(),
          parentLastName: pLast.trim(),
          parentEmail: pEmail.trim(),
          message: message.trim() || undefined,
        }
      : {
          isMinor: false,
          role,
          inviteeFirstName: firstName.trim(),
          inviteeLastName: lastName.trim(),
          email: email.trim(),
          message: message.trim() || undefined,
        };

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send invite.");

      toast.success("Invite sent!");
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
    >
      <FormSelect
        label="Role"
        value={role}
        onChange={setRole}
        options={roleOptions}
        placeholder="Select role..."
      />

      {/* Minor toggle */}
      <div>
        <label className="inline-flex items-center gap-2 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
          />
          <span className="text-sm">Invite is for a minor</span>
        </label>
      </div>

      {/* Invitee name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Invitee First Name"
          name="inviteeFirstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <FormField
          label="Invitee Last Name"
          name="inviteeLastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      {/* Adult email OR Parent contact */}
      {!isMinor ? (
        <FormField
          label="Invitee Email"
          name="inviteeEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Parent First Name"
              name="parentFirstName"
              value={pFirst}
              onChange={(e) => setPFirst(e.target.value)}
              required
            />
            <FormField
              label="Parent Last Name"
              name="parentLastName"
              value={pLast}
              onChange={(e) => setPLast(e.target.value)}
              required
            />
          </div>
          <FormField
            label="Parent Email"
            name="parentEmail"
            type="email"
            value={pEmail}
            onChange={(e) => setPEmail(e.target.value)}
            required
          />
        </div>
      )}

      <FormField
        label="Message (optional)"
        name="message"
        as="textarea"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a note for the recipient…"
      />

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send Invite"}
        </button>
      </div>
    </form>
  );
}
