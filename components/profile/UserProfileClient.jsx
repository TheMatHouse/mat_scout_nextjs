"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/authClient";
import Image from "next/image";
import Link from "next/link";
import StyleCard from "@/components/profile/StyleCard";
import { notFound } from "next/navigation";

export default function UserProfileClient({ username }) {
  const [profileUser, setProfileUser] = useState();
  const [currentUser, setCurrentUser] = useState(undefined);
  const [loading, setLoading] = useState();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/users/${username}`);
        const data = await res.json();
        setProfileUser(data?.user || null);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setProfileUser(null);
      }

      const viewer = await getCurrentUser();
      setCurrentUser(viewer);
      setLoading(false);
    }
    fetchData();
  }, [username]);

  if (loading || currentUser === undefined) return <div>Loading...</div>;
  if (!profileUser) return notFound();

  const isMyProfile = currentUser?.username === profileUser.username;

  if (!profileUser.allowPublic && !isMyProfile) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-20">
        <h1 className="text-2xl font-semibold mb-4">This profile is private</h1>
        <p className="text-gray-600 dark:text-gray-400">
          The owner of this profile has chosen to keep it private.
        </p>
      </div>
    );
  }
  console.log(profileUser);
  const styleResults = {};
  if (Array.isArray(profileUser.userStyles)) {
    profileUser.userStyles.forEach((style) => {
      const normalizedStyleName = style.styleName?.trim().toLowerCase();
      const reports = profileUser.matchReports?.filter(
        (report) =>
          report.matchType?.trim().toLowerCase() === normalizedStyleName
      );

      const wins = reports?.filter((r) => r.result === "Won").length || 0;
      const losses = reports?.filter((r) => r.result === "Lost").length || 0;

      styleResults[normalizedStyleName] = { Wins: wins, Losses: losses };
    });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left Sidebar */}
      <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-border p-6 text-center space-y-4 self-start">
        <Image
          src={profileUser.avatar || "/default-avatar.png"}
          alt={profileUser.firstName || "User avatar"}
          width={100}
          height={100}
          className="rounded-full mx-auto border border-border"
        />
        <h1 className="text-xl font-bold mt-4">
          {profileUser.firstName} {profileUser.lastName}
        </h1>
        <p className="text-sm text-black dark:text-white">
          @{profileUser.username}
        </p>

        {/* Teams */}
        {profileUser.teams?.length > 0 && (
          <div className="text-left space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              Teams
            </h3>
            <ul className="space-y-1">
              {profileUser.teams.map((team) => (
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
      </div>

      {/* Right Content */}
      <div className="md:col-span-3 grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {profileUser.userStyles?.length > 0 ? (
          profileUser.userStyles.map((style) => (
            <StyleCard
              key={style._id || style}
              style={style}
              styleResults={
                styleResults[style.styleName?.trim().toLowerCase()] || {}
              }
              username={profileUser.username}
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
