"use client";

import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/shared/FormField";
import FormSelect from "@/components/shared/FormSelect";
import Link from "next/link";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "not specified", label: "Not specified" },
];

// Role precedence for merging duplicates
const ROLE_RANK = {
  owner: 4,
  manager: 3,
  coach: 2,
  member: 1,
};

function rankOf(role) {
  return ROLE_RANK[String(role || "").toLowerCase()] || 0;
}

/* ---------------- activity helpers (today / recent / inactive) ---------------- */

function getLastActivityDate(user) {
  return user?.lastActiveAt || user?.lastLogin || null;
}

function daysSince(date) {
  if (!date) return Infinity;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatRelativeTime(date) {
  if (!date) return "Never";

  const ts = new Date(date).getTime();
  if (!ts) return "Never";

  const diffMin = Math.floor((Date.now() - ts) / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";

  return `${diffDay} days ago`;
}

function getActivityBadge(date) {
  const d = daysSince(date);

  if (d < 1) {
    return {
      label: "Active today",
      className: "bg-green-600 text-white",
    };
  }

  if (d < 30) {
    return {
      label: "Recently active",
      className: "bg-yellow-500 text-black",
    };
  }

  return {
    label: "Inactive 30+ days",
    className: "bg-red-600 text-white",
  };
}

/* ---------------- memberships helpers ---------------- */

function normalizeMembershipItem(item) {
  if (!item) return null;

  if (item.team && (item.team.name || item.team.slug)) {
    return {
      key: item._id || `${item.team.slug}-${item.role || "member"}`,
      team: {
        name: item.team.name || item.team.teamName || "Unknown Team",
        slug: item.team.slug || item.team.teamSlug || null,
      },
      role: (item.role || "member").toLowerCase(),
    };
  }

  if ((item.teamName || item.teamSlug) && !item.team) {
    return {
      key: item._id || `${item.teamSlug}-owner`,
      team: {
        name: item.teamName || "Unknown Team",
        slug: item.teamSlug || null,
      },
      role: "owner",
    };
  }

  if (item.team && item.role) {
    return {
      key: item.key || item._id || `${item.team.slug}-${item.role}`,
      team: {
        name: item.team.name || "Unknown Team",
        slug: item.team.slug || null,
      },
      role: String(item.role).toLowerCase(),
    };
  }

  return null;
}

function useMergedTeams(memberships = [], ownerTeams = []) {
  return useMemo(() => {
    const normalized = [
      ...memberships.map(normalizeMembershipItem),
      ...ownerTeams.map(normalizeMembershipItem),
    ].filter(Boolean);

    const bySlug = new Map();
    for (const entry of normalized) {
      const slug =
        entry.team?.slug || `__no_slug__:${entry.team?.name || "unknown"}`;
      const existing = bySlug.get(slug);

      if (!existing || rankOf(entry.role) > rankOf(existing.role)) {
        bySlug.set(slug, entry);
      }
    }

    return Array.from(bySlug.values()).sort((a, b) => {
      const rdiff = rankOf(b.role) - rankOf(a.role);
      if (rdiff !== 0) return rdiff;
      return (a.team?.name || "").localeCompare(b.team?.name || "");
    });
  }, [memberships, ownerTeams]);
}

/* ---------------- component ---------------- */

const AdminUserDetailClient = ({ initialData }) => {
  const [bundle, setBundle] = useState(initialData);
  const { user, family, memberships, stats, ownerTeams } = bundle || {};

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

  const mergedTeams = useMergedTeams(memberships, ownerTeams);
  const [saving, setSaving] = useState(false);
  const id = user?._id;

  const lastActive = getLastActivityDate(user);
  const activityBadge = getActivityBadge(lastActive);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.firstName} {user.lastName}{" "}
            <Link
              href={`/${user.username}`}
              className="text-gray-600 dark:text-gray-300 hover:underline"
            >
              @{user.username}
            </Link>
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
            {user.email} • {formatRelativeTime(lastActive)}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${activityBadge.className}`}
            >
              {activityBadge.label}
            </span>
          </p>
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
                    : "text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-[var(--ms-light-red)]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile */}
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

          <FormSelect
            label="Gender"
            value={form.gender}
            onChange={(val) => setForm({ ...form, gender: val })}
            options={GENDER_OPTIONS}
            placeholder="Select gender…"
          />

          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) =>
                  setForm({ ...form, verified: e.target.checked })
                }
              />
              <span>Verified</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
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

      {/* Family */}
      {tab === "Family" && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {family?.length ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {family.map((m) => (
                <li
                  key={m._id}
                  className="py-3"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    DOB: {m.bDay}/{m.bMonth}/{m.bYear}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">
              No family members.
            </p>
          )}
        </div>
      )}

      {/* Teams */}
      {tab === "Teams" && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {mergedTeams?.length ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {mergedTeams.map((m) => (
                <li
                  key={m.key}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {m.team?.name || "Unknown Team"}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">
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
            <p className="text-gray-600 dark:text-gray-300">
              No team memberships.
            </p>
          )}
        </div>
      )}

      {/* Reports */}
      {tab === "Reports" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[hsl(222_47%_11%)] text-white">
            <div className="text-sm opacity-80">Match Reports</div>
            <div className="text-3xl font-bold">
              {stats?.matchReportsCount ?? 0}
            </div>
            <div className="mt-2">
              <Link
                href={`/admin/users/${user._id}/reports/matches`}
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
};

export default AdminUserDetailClient;
