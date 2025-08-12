// app/admin/teams/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { toast } from "react-toastify";

export default function AdminTeamPage() {
  const params = useParams();
  const teamId = params?.id || params?.teamId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);

  // filter + sorting
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("name"); // 'name' | 'username'
  const [sortDir, setSortDir] = useState("asc"); // 'asc' | 'desc'

  // track per-row saving state for role updates
  const [savingRole, setSavingRole] = useState({}); // { [memberId]: true }

  const fetchTeam = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}?ts=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      setTeam(data.team);
      setMembers(Array.isArray(data.members) ? data.members : []);
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (e) {
      console.error("Admin team fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const getDisplayName = (m) => {
    const p = m?.person || {};
    return (
      (p.name && p.name.trim()) ||
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
      p.username ||
      p.email ||
      "—"
    );
  };
  const getUsername = (m) => m?.person?.username || "";
  const getEmail = (m) => m?.person?.email || "";

  const filteredSorted = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let arr = members;

    if (q) {
      arr = arr.filter((m) => {
        const parent = m.parent || {};
        const hay = [
          getDisplayName(m),
          getUsername(m),
          getEmail(m),
          parent.name || "",
          parent.email || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const cmp = (a, b, key) => {
      const av = key === "username" ? getUsername(a) : getDisplayName(a);
      const bv = key === "username" ? getUsername(b) : getDisplayName(b);
      return av.localeCompare(bv, undefined, { sensitivity: "base" });
    };

    const out = [...arr].sort((a, b) => cmp(a, b, sortKey));
    if (sortDir === "desc") out.reverse();
    return out;
  }, [members, filter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const updateRole = async (m, nextRole) => {
    if (!team) return;
    const id = m._id;
    setSavingRole((s) => ({ ...s, [id]: true }));
    const prevRole = m.role;

    // optimistic UI
    setMembers((list) =>
      list.map((row) => (row._id === id ? { ...row, role: nextRole } : row))
    );

    try {
      const res = await fetch(`/api/admin/teams/${team._id}/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }

      // ✅ success toast
      const nice = nextRole.charAt(0).toUpperCase() + nextRole.slice(1);
      toast.success(`Role updated to ${nice}.`);
    } catch (err) {
      // revert on error
      setMembers((list) =>
        list.map((row) => (row._id === id ? { ...row, role: prevRole } : row))
      );
      toast.error(err.message || "Could not update role.");
    } finally {
      setSavingRole((s) => {
        const { [id]: _, ...rest } = s;
        return rest;
      });
    }
  };

  const removeMember = async (m) => {
    if (!team) return;
    const name = getDisplayName(m);
    if (!window.confirm(`Remove ${name} from ${team.teamName}?`)) return;
    try {
      const res = await fetch(`/api/admin/teams/${team._id}/members/${m._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }
      await fetchTeam();
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not remove member.");
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading team…</div>;
  if (!team) return <div className="p-6 text-red-500">Team not found.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{team.teamName}</h1>
          <div className="text-sm text-gray-400">@{team.teamSlug}</div>
        </div>
        <button
          onClick={() => router.back()}
          className="btn-white-sm"
          type="button"
        >
          ← Back
        </button>
      </div>

      <section className="bg-[#0f172a] rounded-xl border border-slate-800/70 overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter members…"
            className="w-full px-3 py-2 rounded-md bg-slate-900/70 border border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <Th>
                  <SortHeader
                    label="Name"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                </Th>
                <Th>Email</Th>
                <Th>
                  <SortHeader
                    label="Username"
                    active={sortKey === "username"}
                    dir={sortDir}
                    onClick={() => toggleSort("username")}
                  />
                </Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map((m) => {
                const email = getEmail(m);
                const username = getUsername(m);
                const saving = !!savingRole[m._id];

                return (
                  <tr
                    key={m._id}
                    className="border-t border-slate-800/70"
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {getDisplayName(m)}
                        </span>
                        {m.kind === "family" && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-200">
                            Family
                          </span>
                        )}
                      </div>
                      {m.kind === "family" && (
                        <div className="mt-0.5 text-xs text-gray-400">
                          Parent:{" "}
                          <span className="font-medium text-gray-300">
                            {m.parent?.name || "—"}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="underline underline-offset-2"
                          style={{ color: "inherit" }}
                        >
                          {email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3">{username || "—"}</td>

                    {/* Role dropdown */}
                    <td className="px-4 py-3">
                      <select
                        value={m.role || ""}
                        onChange={(e) => updateRole(m, e.target.value)}
                        disabled={saving}
                        className="bg-slate-900/70 text-white border border-slate-700 rounded-md px-2 py-1 disabled:opacity-60"
                      >
                        <option value="manager">Manager</option>
                        <option value="coach">Coach</option>
                        <option value="member">Member</option>
                        <option value="pending">Pending</option>
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-right pr-4">
                      <button
                        onClick={() => removeMember(m)}
                        className="btn-white-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSorted.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No members match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* (Invites section stays as you had it) */}
    </div>
  );
}

/* helpers */
function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left text-slate-200 font-semibold px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}
function SortHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:opacity-90"
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`h-4 w-4 ${active ? "opacity-100" : "opacity-40"}`}
      />
      {active && (
        <span className="sr-only">
          {dir === "asc" ? "ascending" : "descending"}
        </span>
      )}
    </button>
  );
}
