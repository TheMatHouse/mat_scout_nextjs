// components/teams/forms/InviteMemberForm.jsx
"use client";

import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Editor from "@/components/shared/Editor";
import { adminInviteSent } from "@/lib/analytics/adminEvents";

export default function InviteMemberForm({
  slug,
  setOpen,
  onSuccess,
  team,
  managerName,
}) {
  const [role, setRole] = useState("member");
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

  const defaultMessage = useMemo(() => {
    const teamName = team?.teamName || "our team";
    const signed = managerName || "";
    return `
    <p>Hi,</p>
    <p>I'd like to invite you to join <strong>${teamName}</strong> on MatScout.</p>
    <p>Thanks,</p>
    <p>${signed}</p>
  `;
  }, [team?.teamName, managerName]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // build parent fields ONLY when minor
      const parentName = isMinor ? `${pFirst} ${pLast}`.trim() : undefined;
      const parentEmail = isMinor ? pEmail : undefined;

      const payload = {
        firstName,
        lastName,
        role, // send 'role'
        email, // adult email; ignored by server if isMinor === true
        isMinor,
        parentName, // only present when minor
        parentEmail, // only present when minor
        message,
      };

      const res = await fetch(`/api/teams/${slug}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invite");
      }

      const displayName = `${firstName} ${lastName}`.trim();
      toast.success(`Invitation sent to ${displayName} as ${role}`);

      // optional analytics (unchanged)
      try {
        adminInviteSent?.({ slug, role, isMinor });
      } catch {}

      // ✅ refresh lists and close modal
      await onSuccess?.();
      setOpen(false);

      // optional: reset fields for next time the modal opens
      setIsMinor(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPFirst("");
      setPLast("");
      setPEmail("");
      setMessage("");
    } catch (err) {
      toast.error(err.message || "Failed to send invite");
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

      <Editor
        name="message"
        text={message || defaultMessage}
        onChange={setMessage}
        label="Message (optional)"
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
