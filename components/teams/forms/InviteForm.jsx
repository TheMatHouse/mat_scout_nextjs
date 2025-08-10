"use client";
import { useState } from "react";
import { Send, UserPlus } from "lucide-react";

export default function InviteForm({ slug, onCreated }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "member",
    email: "",
    isMinor: false,
    parentName: "",
    parentEmail: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
        isMinor: !!form.isMinor,
        message: form.message?.trim() || "",
      };
      if (form.isMinor) {
        payload.parentName = form.parentName.trim();
        payload.parentEmail = form.parentEmail.trim().toLowerCase();
      } else {
        payload.email = form.email.trim().toLowerCase();
      }

      const res = await fetch(`/api/teams/${slug}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to send invite");
      }

      setSuccess("Invitation sent!");
      setForm({
        firstName: "",
        lastName: "",
        role: "member",
        email: "",
        isMinor: false,
        parentName: "",
        parentEmail: "",
        message: "",
      });
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Invite a Member
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              First name
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) =>
                setForm((s) => ({ ...s, firstName: e.target.value }))
              }
              required
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Last name
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) =>
                setForm((s) => ({ ...s, lastName: e.target.value }))
              }
              required
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            >
              <option value="member">Member</option>
              <option value="coach">Coach</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isMinor"
            type="checkbox"
            checked={form.isMinor}
            onChange={(e) =>
              setForm((s) => ({ ...s, isMinor: e.target.checked }))
            }
            className="h-4 w-4"
          />
          <label
            htmlFor="isMinor"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Invite is for a minor (send to parent/guardian)
          </label>
        </div>

        {!form.isMinor && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
              required
              className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            />
          </div>
        )}

        {form.isMinor && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Parent/Guardian name
              </label>
              <input
                type="text"
                value={form.parentName}
                onChange={(e) =>
                  setForm((s) => ({ ...s, parentName: e.target.value }))
                }
                required
                className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Parent/Guardian email
              </label>
              <input
                type="email"
                value={form.parentEmail}
                onChange={(e) =>
                  setForm((s) => ({ ...s, parentEmail: e.target.value }))
                }
                required
                className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
            Optional message
          </label>
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) =>
              setForm((s) => ({ ...s, message: e.target.value }))
            }
            className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            placeholder="Add any context for the invitee (optional)"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Sending..." : "Send Invite"}
          </button>
          <p className="text-xs text-gray-500">
            Invitees will get an email with a link to join your team.
          </p>
        </div>
      </form>
    </section>
  );
}
