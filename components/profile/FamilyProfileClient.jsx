"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StyleCard from "@/components/profile/StyleCard";
import Spinner from "../shared/Spinner";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export default function FamilyProfileClient({ username, initialData }) {
  const [member, setMember] = useState(initialData);
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
  }, [username, initialData]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] bg-background">
        <Spinner size={64} />
        <p className="text-gray-400 dark:text-gray-300 mt-2 text-lg">
          Loading profile...
        </p>
      </div>
    );
  }

  if (!member) return notFound();

  // Avatar (request 200x200; render 100x100 for crisp 2x)
  const rawAvatar =
    member.avatar ||
    "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
  const avatarUrl =
    cld(rawAvatar, "w_200,h_200,c_fill,g_auto,dpr_auto") || rawAvatar;

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
      {/* Left Sidebar */}
      <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-border p-6 text-center space-y-4 self-start">
        <Image
          src={avatarUrl}
          alt={member.firstName}
          width={100}
          height={100}
          className="rounded-full mx-auto border border-border object-cover"
          loading="lazy"
          sizes="100px"
        />
        <h1 className="text-xl font-bold mt-4">
          {member.firstName} {member.lastName}
        </h1>
        <p className="text-sm text-black dark:text-white">@{member.username}</p>

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
              {member.teams.map((team) => {
                const rawLogo = team.logoURL || "/default-team.png";
                // Request 56x56; render 28x28 for crisp 2x
                const logoUrl =
                  cld(rawLogo, "w_56,h_56,c_fill,g_auto,dpr_auto") || rawLogo;

                return (
                  <li
                    key={team._id}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src={logoUrl}
                      alt={team.teamName}
                      width={28}
                      height={28}
                      className="rounded-full border border-border object-cover"
                      loading="lazy"
                      sizes="28px"
                    />
                    <Link
                      href={`/teams/${team.teamSlug}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {team.teamName}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Right Content */}
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
