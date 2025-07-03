// app/teams/page.jsx  (or wherever your TeamsPage lives)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
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
    }
    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
        Teams
      </h1>

      {/* My Teams */}
      {myTeams.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            My Teams
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {myTeams.map((team) => (
              <TeamCard
                key={team._id}
                team={team}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Teams Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          All Teams
        </h2>
        <Link
          href="/teams/new"
          className="inline-block bg-ms-blue hover:bg-ms-dark-red text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Team
        </Link>
      </div>

      {/* All Teams List */}
      {teams.length === 0 ? (
        <p className="text-gray-500">No teams available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable TeamCard component
function TeamCard({ team }) {
  // Build location string
  const parts = [];
  if (team.city) parts.push(team.city);
  if (team.state) parts.push(team.state);
  if (team.country) parts.push(team.country);
  const location = parts.join(", ");

  return (
    <Link
      href={`/teams/${team.teamSlug}`}
      className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition"
    >
      {team.logoURL && (
        <div className="flex justify-center mb-4">
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
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
          {location}
        </p>
      )}
    </Link>
  );
}
