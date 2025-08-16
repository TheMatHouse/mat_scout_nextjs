// app/(teams)/teams/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TeamModal from "@/components/teams/TeamModal";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  // ---- helpers -------------------------------------------------------------

  const pickLogo = (obj) => obj?.logoURL || obj?.logoUrl || obj?.logo || null;

  function mergeMyTeams(primary = [], fallback = []) {
    // Prefer PRIMARY records; then merge fallback (memberships) without
    // overwriting richer fields like the logo.
    const bySlug = new Map();

    primary.forEach((p) => {
      const slug = p?.teamSlug || p?.slug;
      if (!slug) return;
      bySlug.set(slug, { ...p });
    });

    fallback.forEach((f) => {
      const slug = f?.teamSlug || f?.slug;
      if (!slug) return;

      const existing = bySlug.get(slug);
      if (!existing) {
        bySlug.set(slug, { ...f });
        return;
      }

      const merged = { ...existing, ...f };
      const existingLogo = pickLogo(existing);
      const fallbackLogo = pickLogo(f);
      if (!fallbackLogo && existingLogo) {
        merged.logoURL = existingLogo;
      } else if (fallbackLogo && !existingLogo) {
        merged.logoURL = fallbackLogo;
      }
      bySlug.set(slug, merged);
    });

    return [...bySlug.values()];
  }

  function mapMembershipsToTeams(payload) {
    const list = Array.isArray(payload?.memberships) ? payload.memberships : [];
    return list
      .map((m) => {
        const team = m.team || {};
        const logo =
          m.logoURL || m.logoUrl || team.logoURL || team.logoUrl || team.logo;
        return {
          _id: m.teamId || team._id || m._id,
          teamSlug: m.teamSlug || team.teamSlug,
          teamName: m.teamName || team.teamName,
          logoURL: logo || null,
          city: m.city || team.city,
          state: m.state || team.state,
          country: m.country || team.country,
          role: m.role,
        };
      })
      .filter((t) => t.teamSlug && t.teamName);
  }

  async function hydrateMissingLogos(list) {
    const need = list
      .filter((t) => !pickLogo(t))
      .map((t) => t.teamSlug)
      .filter(Boolean);

    if (!need.length) return list;

    // Hydrate each missing logo by fetching the team summary
    // If you already have a batch endpoint, swap this to that for efficiency.
    const filled = await Promise.all(
      need.map(async (slug) => {
        try {
          const r = await fetch(
            `/api/teams/${slug}?summary=1&ts=${Date.now()}`
          );
          if (!r.ok) return { slug, logoURL: null };
          const data = await r.json();
          const logo =
            data?.team?.logoURL ||
            data?.team?.logoUrl ||
            data?.team?.logo ||
            data?.logoURL ||
            data?.logoUrl ||
            data?.logo ||
            null;
          return { slug, logoURL: logo };
        } catch {
          return { slug, logoURL: null };
        }
      })
    );

    const map = new Map(filled.map((x) => [x.slug, x.logoURL]));
    return list.map((t) =>
      map.has(t.teamSlug) && map.get(t.teamSlug)
        ? { ...t, logoURL: map.get(t.teamSlug) }
        : t
    );
  }

  // ---- fetchers ------------------------------------------------------------

  const fetchTeams = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        name,
        city,
        state,
        country,
        page: String(pageNumber),
        limit: "6",
        ts: String(Date.now()),
      });

      const res = await fetch(`/api/teams?${params.toString()}`);
      const data = await res.json();

      setTeams(Array.isArray(data?.teams) ? data.teams : []);
      setPage(data?.page || 1);
      setTotalPages(data?.totalPages || 1);

      const fromList = Array.isArray(data?.myTeams) ? data.myTeams : [];

      let fallback = [];
      try {
        const r2 = await fetch(
          `/api/teams/memberships?activeOnly=1&ts=${Date.now()}`
        );
        if (r2.ok) {
          const mData = await r2.json();
          fallback = mapMembershipsToTeams(mData);
        }
      } catch {
        // ignore membership fetch issues; we'll just show what we have
      }

      const merged = mergeMyTeams(fromList, fallback);
      const hydrated = await hydrateMissingLogos(merged);
      setMyTeams(hydrated);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, city, state, country]);

  const clearFilters = () => {
    setName("");
    setCity("");
    setState("");
    setCountry("");
    fetchTeams(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchTeams(newPage);
    }
  };

  // ---- pagination builder --------------------------------------------------

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page > 3) pages.push(1, "...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...", totalPages);
    }

    return pages;
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col items-start gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Teams
            </h1>
            <Button
              className="btn btn-primary"
              onClick={() => setOpen(true)}
            >
              + Add Team
            </Button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-300">
            Search for your team by name, city, state, or country. If you can’t
            find it, click <span className="font-semibold">Add Team</span>.
          </p>

          {/* Filters */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Team Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTeams(1)}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTeams(1)}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTeams(1)}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTeams(1)}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => fetchTeams(1)}
                className="btn btn-primary"
              >
                Search
              </Button>
              <Button
                onClick={clearFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Teams List */}
          <section className="space-y-4 mt-6">
            {loading ? (
              <p>Loading teams...</p>
            ) : teams.length === 0 ? (
              <p className="text-gray-500">No teams available yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {teams.map((team) => (
                    <TeamCard
                      key={team._id}
                      team={team}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-2 bg-gray-300 dark:bg-gray-700 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>

                    {renderPagination().map((p, i) =>
                      p === "..." ? (
                        <span
                          key={i}
                          className="px-2 text-gray-500 dark:text-gray-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`px-3 py-2 rounded ${
                            page === p
                              ? "bg-[var(--ms-blue)] text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-2 bg-gray-300 dark:bg-gray-700 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* ASIDE: My Teams */}
        <aside className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            My Teams
          </h2>
          {myTeams.length === 0 ? (
            <p className="text-gray-500 text-sm">You have no teams yet.</p>
          ) : (
            <div className="space-y-4">
              {myTeams.map((team) => (
                <TeamCard
                  key={team.teamSlug}
                  team={team}
                  small
                />
              ))}
            </div>
          )}
        </aside>
      </div>

      <TeamModal
        open={open}
        setOpen={setOpen}
        onSuccess={fetchTeams}
      />
    </div>
  );
}

function TeamCard({ team, small }) {
  const location = [team.city, team.state, team.country]
    .filter(Boolean)
    .join(", ");

  const logo = team.logoURL || team.logoUrl || team.logo || null;
  const initials = (team.teamName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    team.role === "manager"
      ? "Manager"
      : team.role === "coach"
      ? "Coach"
      : team.role === "member"
      ? "Member"
      : team.role === "owner"
      ? "Owner"
      : null;

  return (
    <Link
      href={`/teams/${team.teamSlug}`}
      className={`block bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition ${
        small ? "text-center" : ""
      }`}
    >
      <div className="flex justify-center mb-3">
        {logo ? (
          <img
            src={logo}
            alt={`${team.teamName} logo`}
            width={80}
            height={80}
            className="rounded-full object-cover w-20 h-20"
          />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 font-semibold">
            {initials}
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
        {team.teamName}
      </h3>

      {roleLabel && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
          {roleLabel}
        </p>
      )}

      {!small && location && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
          {location}
        </p>
      )}
    </Link>
  );
}
