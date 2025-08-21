"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export default function MyTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // Reuse existing API that returns { myTeams: [...] }
        const res = await fetch(`/api/teams?limit=0`);
        const data = await res.json();
        setMyTeams(Array.isArray(data?.myTeams) ? data.myTeams : []);
      } catch (e) {
        setMyTeams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-gray-500 dark:text-gray-400">Loading your teams…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Teams
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Teams you own or belong to as a manager, coach, or member.
        </p>
      </header>

      {myTeams.length === 0 ? (
        <div className="rounded-xl border border-border bg-white dark:bg-gray-800 p-6">
          <p className="text-gray-600 dark:text-gray-300">
            You’re not in any teams yet.{" "}
            <Link
              className="text-blue-600 dark:text-blue-400 underline"
              href="/teams/find"
            >
              Find teams
            </Link>{" "}
            or{" "}
            <Link
              className="text-blue-600 dark:text-blue-400 underline"
              href="/teams/create"
            >
              create one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTeams.map((team) => (
            <Link
              key={team._id}
              href={`/teams/${team.teamSlug}`}
              className="group block rounded-2xl border border-border bg-white dark:bg-gray-800 p-5 shadow hover:shadow-lg transition"
            >
              <div className="flex flex-col items-center text-center">
                {team.logoURL ? (
                  <Image
                    src={cld(team.logoURL, "w_168,h_168,c_fill,g_auto")}
                    alt={`${team.teamName} logo`}
                    width={84}
                    height={84}
                    className="rounded-full object-cover mb-3"
                    loading="lazy"
                    sizes="(max-width: 768px) 84px, 84px"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600 mb-3" />
                )}
                <h3 className="text-lg font-bold">{team.teamName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {[team.city, team.state, team.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>

                {/* Role pill */}
                {team.role && (
                  <span className="mt-3 inline-block text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    {team.role}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
