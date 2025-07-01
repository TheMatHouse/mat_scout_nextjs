"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams");
        const data = await res.json();
        setTeams(data.teams || []);
        setMyTeams(data.myTeams || []);
      } catch (error) {
        console.error("Error fetching teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Teams</h1>

      {/* My Teams Section */}
      {myTeams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Teams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {myTeams.map((team) => (
              <Link
                key={team._id}
                href={`/teams/${team.teamSlug}`}
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {team.teamName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    /teams/{team.teamSlug}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Teams Section */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Teams</h2>
        <Link
          href="/teams/new"
          className="btn"
        >
          Add Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <p className="text-gray-500">No teams available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link
              key={team._id}
              href={`/teams/${team.teamSlug}`}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                <img
                  src={team.logoURL}
                  alt={team.teamName}
                  className="w-20 h-20 object-cover rounded-full mb-4"
                />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {team.teamName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {team.city}, {team.state}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
