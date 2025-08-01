"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  // ✅ Fetch teams
  const fetchTeams = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        name,
        city,
        state,
        country,
        page: pageNumber,
        limit: 6,
      });

      const res = await fetch(`/api/teams?${params.toString()}`);
      const data = await res.json();

      setTeams(data.teams || []);
      setMyTeams(data.myTeams || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams(1);
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchTeams(1);
  };

  // ✅ Build pagination range with ellipsis
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* MAIN */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Teams
            </h1>
            <Link
              href="/teams/new"
              className="inline-block bg-[var(--ms-blue-gray)] hover:bg-[var(--ms-light-gray)] text-black dark:text-gray-900 font-semibold px-4 py-2 rounded-lg shadow transition"
            >
              + Add Team
            </Link>
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
                onKeyDown={handleKeyDown}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchTeams(1)}
                className="bg-[var(--ms-blue)] hover:bg-[var(--ms-dark-red)] text-white px-4 py-2 rounded-lg"
              >
                Search
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Clear Filters
              </button>
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
                  key={team._id}
                  team={team}
                  small
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TeamCard({ team, small }) {
  const location = [team.city, team.state, team.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/teams/${team.teamSlug}`}
      className={`block bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition ${
        small ? "text-center" : ""
      }`}
    >
      {team.logoURL && (
        <div className="flex justify-center mb-3">
          <Image
            src={team.logoURL}
            alt={`${team.teamName} logo`}
            width={80}
            height={80}
            className="rounded-full object-cover"
          />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">
        {team.teamName}
      </h3>
      {location && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
          {location}
        </p>
      )}
    </Link>
  );
}
