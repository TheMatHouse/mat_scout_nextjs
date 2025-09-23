// components/profile/FamilyProfileClient.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Spinner from "@/components/shared/Spinner";
import StyleCard from "@/components/profile/StyleCard";
import FollowButton from "@/components/shared/FollowButton";
import FollowListModal from "@/components/profile/FollowListModal";

function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url;
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export default function FamilyProfileClient({ username }) {
  // profile: undefined=loading, null=404, object=ready
  const [profile, setProfile] = useState();
  // initialize to null so we don't block render on an "undefined" sentinel
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // followers count + modal open flag
  const [followersTotal, setFollowersTotal] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);

  const refreshFollowersCount = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/family/${encodeURIComponent(username)}/followers?limit=1`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setFollowersTotal(Number(data?.total || 0));
    } catch {
      // ignore transient errors
    }
  }, [username]);

  // When follow state changes (from the button), update the count and then refresh from server
  const handleFollowChange = useCallback(
    async (nowFollowing) => {
      // optimistic update
      setFollowersTotal((n) => Math.max(0, n + (nowFollowing ? 1 : -1)));
      // authoritative refresh
      await refreshFollowersCount();
    },
    [refreshFollowersCount]
  );

  useEffect(() => {
    let cancelled = false;
    setApiError("");
    setLoading(true);

    (async () => {
      try {
        // Fetch profile + viewer concurrently
        const [famRes, meRes] = await Promise.all([
          fetch(`/api/family/${encodeURIComponent(username)}`, {
            cache: "no-store",
          }),
          fetch("/api/auth/me", { cache: "no-store" }).catch(() => null),
        ]);

        // viewer
        if (meRes?.ok) {
          const meJson = await meRes.json().catch(() => ({}));
          if (!cancelled) setCurrentUser(meJson.user || null);
        } else if (!cancelled) {
          setCurrentUser(null);
        }

        // family profile
        if (famRes.status === 404) {
          if (!cancelled) setProfile(null); // will trigger notFound()
        } else if (!famRes.ok) {
          const body = await famRes.text().catch(() => "");
          console.error(
            "GET /api/family/[username] failed:",
            famRes.status,
            body
          );
          if (!cancelled) {
            setProfile(undefined);
            setApiError("Sorry, we couldn’t load this profile right now.");
          }
        } else {
          const data = await famRes.json().catch(() => ({}));
          if (!cancelled) setProfile(data?.family || undefined);
        }
      } catch (e) {
        console.error("Error fetching family profile:", e);
        if (!cancelled) {
          setProfile(undefined);
          setCurrentUser(null);
          setApiError("Sorry, we couldn’t load this profile right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  // initial followers count
  useEffect(() => {
    refreshFollowersCount();
  }, [refreshFollowersCount]);

  // Loading gate
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

  // True 404
  if (profile === null) return notFound();

  // Soft failure
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-20">
        <h1 className="text-2xl font-semibold mb-3">Profile unavailable</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {apiError || "Please try again later."}
        </p>
      </div>
    );
  }

  // Build W/L per style from matchReports
  const styleResults = {};
  if (Array.isArray(profile.userStyles)) {
    for (const style of profile.userStyles) {
      const key = (style.styleName || "").trim().toLowerCase();
      if (!key) continue;
      const reports =
        profile.matchReports?.filter(
          (r) => (r.matchType || "").trim().toLowerCase() === key
        ) || [];
      const wins = reports.filter((r) => r.result === "Won").length || 0;
      const losses = reports.filter((r) => r.result === "Lost").length || 0;
      styleResults[key] = { Wins: wins, Losses: losses };
    }
  }

  // Avatar
  const DEFAULT_AVATAR =
    "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
  const avatarSrc = (profile.avatar || "").trim() || DEFAULT_AVATAR;
  const avatarUrl =
    cld(avatarSrc, "w_200,h_200,c_fill,g_auto,dpr_auto") || avatarSrc;

  // CORRECT owner check: compare your userId to the family member's userId
  const isOwnerOfFamilyMember =
    !!currentUser?._id && String(currentUser._id) === String(profile.userId);

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left Sidebar */}
      <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-border p-6 text-center space-y-4 self-start">
        <Image
          src={avatarUrl}
          alt={profile.firstName || "Avatar"}
          width={100}
          height={100}
          className="rounded-full mx-auto border border-border object-cover"
          loading="lazy"
          sizes="100px"
        />
        <h1 className="text-xl font-bold mt-4">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="text-sm text-black dark:text-white">@{username}</p>

        {/* Parent link */}
        {profile.parentUsername && (
          <p className="text-xs text-muted-foreground mt-2">
            Parent:{" "}
            <Link
              href={`/${profile.parentUsername}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              @{profile.parentUsername}
            </Link>
          </p>
        )}

        {/* Follow button: only for non-owners */}
        {currentUser && !isOwnerOfFamilyMember && (
          <div className="mt-2">
            <FollowButton
              targetType="family"
              username={username}
              className="!bg-blue-600 !text-white hover:!bg-blue-700 focus-visible:!ring-2 focus-visible:!ring-blue-400 mb-2"
              onChange={handleFollowChange}
            />
          </div>
        )}
        {/* Followers link: always visible */}
        <button
          type="button"
          onClick={() => setFollowersOpen(true)}
          className="block mx-auto mt-3 text-xs font-medium text-black dark:text-white hover:underline"
        >
          Followers {followersTotal}
        </button>
      </div>

      {/* Right Content */}
      <div className="md:col-span-3 grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {profile.userStyles?.length > 0 ? (
          profile.userStyles.map((style) => (
            <StyleCard
              key={style._id || style.styleName || "style"}
              style={style}
              styleResults={
                styleResults[(style.styleName || "").trim().toLowerCase()] || {}
              }
              username={username}
              isFamily={true}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground col-span-full">
            No styles added yet.
          </p>
        )}
      </div>

      {/* Follow list modal for family followers */}
      <FollowListModal
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        username={username}
        targetType="family"
      />
    </section>
  );
}
