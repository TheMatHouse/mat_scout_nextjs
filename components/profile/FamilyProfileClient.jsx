"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/authClient";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StyleCard from "@/components/profile/StyleCard";

export default function FamilyProfileClient({ username, initialData }) {
  const [member, setMember] = useState(initialData);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      fetch(`/api/family/${username}`)
        .then((res) => res.json())
        .then((data) => setMember(data.member || null))
        .catch(() => setMember(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    getCurrentUser().then(setCurrentUser);
  }, [username, initialData]);

  if (loading || currentUser === undefined) return <div>Loading...</div>;
  if (!member) return notFound();

  const isParent = currentUser && member.parentId === currentUser._id;

  if (!member.allowPublic && !isParent) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-20">
        <h1 className="text-2xl font-semibold mb-4">This profile is private</h1>
        <p className="text-gray-600 dark:text-gray-400">
          The owner of this profile has chosen to keep it private.
        </p>
      </div>
    );
  }

  const styleResults = {};
  if (Array.isArray(member?.userStyles)) {
    member.userStyles.forEach((style) => {
      const styleName = style.styleName?.trim().toLowerCase();
      const reports = member.matchReports?.filter(
        (report) => report.matchType?.trim().toLowerCase() === styleName
      );
      const wins = reports?.filter((r) => r.result === "Won").length || 0;
      const losses = reports?.filter((r) => r.result === "Lost").length || 0;
      styleResults[style.styleName] = { Wins: wins, Losses: losses };
    });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-border p-6 text-center space-y-4 self-start">
        <Image
          src={member.avatar || "/default-avatar.png"}
          alt={member.firstName}
          width={100}
          height={100}
          className="rounded-full mx-auto border border-border"
        />
        <h1 className="text-xl font-bold mt-4">
          {member.firstName} {member.lastName}
        </h1>
        <p className="text-sm text-black dark:text-white">@{member.username}</p>

        {isParent && !member.allowPublic && (
          <p className="text-sm text-yellow-500 mt-2">
            This is what the public would see if this profile were public.
          </p>
        )}

        {member.gender && (
          <p className="text-sm text-black dark:text-white">
            Gender: {member.gender}
          </p>
        )}
        {(member.city || member.state || member.country) && (
          <p className="text-sm text-black dark:text-white">
            Location:{" "}
            {[member.city, member.state, member.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}

        {member.teams?.length > 0 && (
          <div className="text-left space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              Teams
            </h3>
            <ul className="space-y-1">
              {member.teams.map((team) => (
                <li
                  key={team._id}
                  className="flex items-center gap-2"
                >
                  <Image
                    src={team.logoURL || "/default-team.png"}
                    alt={team.teamName}
                    width={28}
                    height={28}
                    className="rounded-full border border-border"
                  />
                  <Link
                    href={`/teams/${team.teamSlug}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {team.teamName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href={`/family/${member.username}/scouting-reports`}
          className="block mt-6 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Match Reports
        </Link>
      </div>

      <div className="md:col-span-3 grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {member.userStyles?.length > 0 ? (
          member.userStyles.map((style) => (
            <StyleCard
              key={style._id}
              style={style}
              styleResults={styleResults[style.styleName] || {}}
              username={member.username}
              isFamily
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground col-span-full">
            No styles added yet.
          </p>
        )}
      </div>
    </section>
  );
}
