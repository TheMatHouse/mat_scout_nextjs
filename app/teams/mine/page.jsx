// app/teams/mine/page.jsx
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

// Normalize API responses into a single array of teams, de-duped by slug
function normalizeTeams(payload) {
  let items = [];

  if (Array.isArray(payload?.myTeams)) {
    items = payload.myTeams;
  } else {
    const buckets = [];
    if (Array.isArray(payload?.ownedTeams)) buckets.push(...payload.ownedTeams);
    if (Array.isArray(payload?.memberTeams))
      buckets.push(...payload.memberTeams);
    if (Array.isArray(payload?.teams)) buckets.push(...payload.teams);
    if (buckets.length) items = buckets;
  }

  if (!items.length && Array.isArray(payload)) items = payload;

  // De-dupe by teamSlug (fallback to _id), prefer one that carries a role
  const bySlug = new Map();
  for (const t of items) {
    const key = t?.teamSlug || t?.slug || t?._id || Math.random().toString(36);
    const cur = bySlug.get(key);
    if (!cur) {
      bySlug.set(key, t);
    } else if (!cur?.role && t?.role) {
      bySlug.set(key, t);
    }
  }

  const out = Array.from(bySlug.values());
  out.sort((a, b) => (a?.teamName || "").localeCompare(b?.teamName || ""));
  return out;
}

// Friendly label for role
function toRoleLabel(team) {
  const raw =
    team?.role ||
    team?.memberRole ||
    team?.myRole ||
    team?.membershipRole ||
    "";

  const r = String(raw).trim().toLowerCase();

  if (["manager", "owner", "admin"].includes(r)) return "Manager";
  if (r === "coach") return "Coach";
  if (r === "member") return "Member";

  if (team?.isManager || team?.isOwner || team?.isAdmin) return "Manager";
  if (team?.isCoach) return "Coach";
  if (team?.isMember) return "Member";

  return "";
}

export default function MyTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // ⬇️ unified owned + member list
        const res = await fetch(`/api/teams/mine`, { cache: "no-store" });
        const data = await res.json();
        setMyTeams(normalizeTeams(data));
      } catch {
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
              href="/teams/new"
            >
              create one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTeams.map((team) => {
            const name = team.teamName || team.teamSlug || "Team";
            const loc = [team.city, team.state, team.country]
              .filter(Boolean)
              .join(", ");
            const initials = (name || "T").slice(0, 2).toUpperCase();
            const roleLabel = toRoleLabel(team);

            return (
              <Link
                key={team._id || team.teamSlug}
                href={`/teams/${team.teamSlug}`}
                className="group block rounded-2xl border border-border bg-white dark:bg-gray-800 p-5 shadow hover:shadow-lg transition"
              >
                <div className="flex flex-col items-center text-center">
                  {team.logoURL ? (
                    <Image
                      src={cld(team.logoURL, "w_168,h_168,c_fill,g_auto")}
                      alt={`${name} logo`}
                      width={84}
                      height={84}
                      className="rounded-full object-cover mb-3"
                      loading="lazy"
                      sizes="84px"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600 mb-3 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                      {initials}
                    </div>
                  )}

                  <h3 className="text-lg font-bold">{name}</h3>

                  {roleLabel && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {roleLabel}
                    </p>
                  )}

                  {loc ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {loc}
                    </p>
                  ) : null}

                  <span className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                    View team →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
