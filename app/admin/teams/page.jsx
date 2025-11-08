// app/admin/teams/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* -----------------------------------------
   Cloudinary helper to inject f_auto,q_auto (+ optional transforms)
------------------------------------------ */
const cld = (url, extra = "") => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
};

/* -----------------------------------------
   Pick the best available logo URL from several shapes
------------------------------------------ */
const pickTeamLogoUrl = (team) => {
  if (!team) return null;

  // Exact field you use on team pages
  if (typeof team.logoURL === "string" && team.logoURL.trim())
    return team.logoURL.trim();

  // Common alternates just in case
  if (typeof team.logoUrl === "string" && team.logoUrl.trim())
    return team.logoUrl.trim();
  if (typeof team.logo === "string" && team.logo.trim())
    return team.logo.trim();

  if (team.logo && typeof team.logo === "object") {
    if (typeof team.logo.secure_url === "string" && team.logo.secure_url)
      return team.logo.secure_url;
    if (typeof team.logo.url === "string" && team.logo.url)
      return team.logo.url;
    if (typeof team.logo.public_id === "string" && team.logo.public_id) {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (cloud) {
        return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_fill,w_96,h_96/${team.logo.public_id}`;
      }
    }
  }

  return null;
};

/* -----------------------------------------
   Simple initials placeholder (no external asset needed)
------------------------------------------ */
const DefaultTeamLogo = ({ name = "Team", className = "h-8 w-8" }) => {
  const initials = (name || "T")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${className} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-semibold text-gray-900 dark:text-gray-100`}
      aria-hidden="true"
      title="No Logo"
    >
      {initials}
    </div>
  );
};

/* -----------------------------------------
   Logo cell with graceful fallback
------------------------------------------ */
const TeamLogoCell = ({ team, className = "h-8 w-8" }) => {
  const raw = pickTeamLogoUrl(team);
  const src =
    raw && raw.includes("/upload/")
      ? cld(raw, "c_fill,w_96,h_96") // small square thumb
      : raw || null;

  const [imgSrc, setImgSrc] = useState(src);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    const nextRaw = pickTeamLogoUrl(team);
    const next =
      nextRaw && nextRaw.includes("/upload/")
        ? cld(nextRaw, "c_fill,w_96,h_96")
        : nextRaw || null;
    setImgSrc(next);
    setFailed(!next);
  }, [team]);

  if (!imgSrc || failed) {
    return (
      <DefaultTeamLogo
        name={team?.teamName}
        className={className}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={imgSrc}
      alt={`${team?.teamName || "Team"} logo`}
      className={`${className} rounded object-cover bg-gray-100 dark:bg-gray-700 flex-shrink-0`}
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

/* -----------------------------------------
   Table header cell
------------------------------------------ */
const Th = ({ children, className = "" }) => {
  return (
    <th
      className={`px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-100 ${className}`}
      scope="col"
    >
      {children}
    </th>
  );
};

/* -----------------------------------------
   Page (arrow function + separate default export)
------------------------------------------ */
const AdminTeamsPage = () => {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);

  const pages = useMemo(
    () => Math.max(Math.ceil(total / limit), 1),
    [total, limit]
  );

  useEffect(() => {
    const load = async () => {
      setFetching(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q.trim()) params.set("q", q.trim());
      try {
        const res = await fetch(`/api/admin/teams?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch teams");
        const data = await res.json();
        setRows(data.teams || []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error(e);
        setRows([]);
        setTotal(0);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [q, page, limit]);

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow">
      {/* Header / Search */}
      <header className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
          Teams
        </h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search teams…"
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
            aria-label="Search teams"
          />
          <div className="text-sm text-gray-900 dark:text-gray-100/80 min-w-[6ch] text-right">
            {fetching ? "Loading…" : `${total} total`}
          </div>
        </div>
      </header>

      {/* Table (mobile-friendly: horizontal scroll, sticky header) */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/90 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 dark:supports-[backdrop-filter]:bg-gray-800/80">
            <tr>
              <Th>Team</Th>
              <Th>Slug</Th>
              <Th>Owner</Th>
              <Th className="text-right">Active</Th>
              <Th className="text-right">Pending</Th>
              <Th className="text-right">Invites</Th>
              <Th>Created</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !fetching ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-gray-900 dark:text-gray-100"
                >
                  No teams found.
                </td>
              </tr>
            ) : null}
            {rows.map((t) => (
              <tr
                key={t._id}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TeamLogoCell
                      team={t}
                      className="h-8 w-8"
                    />
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {t.teamName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {t.teamSlug}
                  </code>
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {t.owner ? t.owner.name : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                  {t.activeMembers ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                  {t.pendingMembers ?? 0}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                  {t.pendingInvites ?? 0}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right pr-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/teams/${t.teamSlug}`}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/teams/${t._id}`}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
                    >
                      Manage
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination (bigger tap targets) */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {page} / {pages}
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ms-light-red,#ef4444)]"
          onClick={() => setPage((p) => Math.min(p + 1, pages))}
          disabled={page >= pages}
        >
          Next
        </button>
      </div>
    </section>
  );
};

export default AdminTeamsPage;
