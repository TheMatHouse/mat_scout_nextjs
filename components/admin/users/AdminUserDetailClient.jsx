"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Link from "next/link";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "not specified", label: "Not specified" },
];

export default function AdminUserDetailClient({ initialData }) {
  const [bundle, setBundle] = useState(initialData);
  const { user, family, memberships, stats } = bundle || {};

  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    username: user.username || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "",
    verified: !!user.verified,
    allowPublic: !!user.allowPublic,
    gender: user.gender || "not specified",
  });

  const [saving, setSaving] = useState(false);
  const id = user?._id;

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setBundle((prev) => ({ ...prev, user: data.user }));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  const tabs = ["Profile", "Family", "Teams", "Reports"];
  const [tab, setTab] = useState(tabs[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {user.firstName} {user.lastName}{" "}
            <Link
              href={`/${user.username}`}
              className="text-gray-500 hover:underline"
            >
              @{user.username}
            </Link>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.email} • Last login:{" "}
            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          {/* action buttons if you add later */}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm font-medium ${
                  active
                    ? "text-blue-600 dark:text-[var(--ms-light-red)] border-b-2 border-blue-600 dark:border-[var(--ms-light-red)]"
                    : "text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-[var(--ms-light-red)]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Panels */}
      {tab === "Profile" && (
        <form
          onSubmit={saveProfile}
          className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="First Name"
              name="firstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <FormField
              label="Last Name"
              name="lastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <FormField
              label="Username"
              name="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          {/* Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="City"
              name="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <FormField
              label="State"
              name="state"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <FormField
              label="Country"
              name="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect
              label="Gender"
              value={form.gender}
              onChange={(val) => setForm({ ...form, gender: val })}
              options={GENDER_OPTIONS}
              placeholder="Select gender…"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-3">
            <label className="inline-flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.verified}
                onChange={(e) =>
                  setForm({ ...form, verified: e.target.checked })
                }
              />
              <span>Verified</span>
            </label>

            <label className="inline-flex items-center gap-2 whitespace-nowrap">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.allowPublic}
                onChange={(e) =>
                  setForm({ ...form, allowPublic: e.target.checked })
                }
              />
              <span>Allow Public Profile</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      {tab === "Family" && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {family?.length ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {family.map((m) => (
                <li
                  key={m._id}
                  className="py-3"
                >
                  <div className="font-medium">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    DOB: {m.bDay}/{m.bMonth}/{m.bYear}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No family members.
            </p>
          )}
        </div>
      )}

      {tab === "Teams" && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {memberships?.length ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {memberships.map((m) => (
                <li
                  key={m._id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {m.team?.name || "Unknown Team"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Role: {m.role}
                    </div>
                  </div>
                  {m.team?.slug && (
                    <Link
                      href={`/teams/${m.team.slug}`}
                      className="text-blue-600 dark:text-[var(--ms-light-red)] hover:underline"
                    >
                      View Team
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No team memberships.
            </p>
          )}
        </div>
      )}

      {tab === "Reports" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[hsl(222_47%_11%)] text-white">
            <div className="text-sm opacity-80">Match Reports</div>
            <div className="text-3xl font-bold">
              {stats?.matchReportsCount ?? 0}
            </div>
            <div className="mt-2">
              <Link
                href={`/dashboard/matches`}
                className="underline"
              >
                Open matches
              </Link>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[hsl(222_47%_11%)] text-white">
            <div className="text-sm opacity-80">Scouting Reports</div>
            <div className="text-3xl font-bold">
              {stats?.scoutingReportsCount ?? 0}
            </div>
            <div className="mt-2">
              <Link
                href={`/dashboard/scouting`}
                className="underline"
              >
                Open scouting
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
