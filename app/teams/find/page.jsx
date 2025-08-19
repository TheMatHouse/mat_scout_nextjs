"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function FindTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");

  const fetchTeams = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        name,
        city,
        state,
        country,
        page: pageNumber.toString(),
        limit: "9",
      });

      const res = await fetch(`/api/teams?${params.toString()}`);
      const data = await res.json();

      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error fetching teams:", error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setName("");
    setCity("");
    setState("");
    setCountry("");
    fetchTeams(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchTeams(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchTeams(newPage);
    }
  };

  // simple pagination range (with ellipsis)
  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page > 3) pages.push(1, "…");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("…", totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-8">
      <header className="flex items-center gap-3">
        <Search className="w-6 h-6 text-ms-blue dark:text-ms-light-gray" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Find Teams
        </h1>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 shadow-md rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
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

        <div className="flex gap-3 mt-4">
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

      {/* Results */}
      <section className="space-y-4">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-300">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-300">No teams found.</p>
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
                  p === "…" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-2 text-gray-500 dark:text-gray-400"
                    >
                      …
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
  );
}

function TeamCard({ team }) {
  const location = [team.city, team.state, team.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/teams/${team.teamSlug}`}
      className="block bg-white dark:bg-gray-900 rounded-xl p-5 shadow hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
    >
      <div className="flex flex-col items-center text-center">
        {team.logoURL ? (
          <div className="mb-3">
            <Image
              src={team.logoURL}
              alt={`${team.teamName} logo`}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 mb-3 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-semibold text-gray-700 dark:text-gray-200">
            {initials(team.teamName)}
          </div>
        )}

        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {team.teamName}
        </h3>
        {location && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {location}
          </p>
        )}
      </div>
    </Link>
  );
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}
