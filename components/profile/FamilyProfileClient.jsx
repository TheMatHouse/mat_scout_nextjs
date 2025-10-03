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

// Cloudinary helper
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url;
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

// Minimal sanitizer for display HTML (strip scripts & inline handlers)
function sanitize(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

// Convert plain text (bioText) to lightweight HTML paragraphs/line-breaks
function textToHtml(t = "") {
  const esc = String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // split by blank lines into paragraphs; single newlines become <br>
  return esc
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export default function FamilyProfileClient({ username }) {
  // profile: undefined=loading, null=404, object=ready
  const [profile, setProfile] = useState();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // followers count + modal open flag
  const [followersTotal, setFollowersTotal] = useState(0);
  const [followersOpen, setFollowersOpen] = useState(false);

  // Bio (display-only, full-width section below)
  const [bioHtml, setBioHtml] = useState("");

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

  // Initial load of profile + viewer
  useEffect(() => {
    let cancelled = false;
    setApiError("");
    setLoading(true);

    (async () => {
      try {
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

  // Load bio (prefer endpoint; fall back to profile payload)
  useEffect(() => {
    let cancelled = false;

    async function loadBio() {
      // Try endpoint first
      try {
        const res = await fetch(
          `/api/family/${encodeURIComponent(username)}/bio`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const html =
            (data?.bioHtml && data.bioHtml.trim()) ||
            (data?.bioText ? textToHtml(data.bioText) : "");
          if (!cancelled) setBioHtml(sanitize(html));
          return;
        }
      } catch {
        // ignore and fall back below
      }

      // Fallback: use profile.bioHtml or profile.bioText
      const fallbackHtml =
        (profile?.bioHtml && String(profile.bioHtml).trim()) ||
        (profile?.bioText ? textToHtml(profile.bioText) : "");
      if (!cancelled) setBioHtml(sanitize(fallbackHtml));
    }

    loadBio();
  }, [username, profile?.bioHtml, profile?.bioText]);

  // Loading gate
  if (loading) {
    return (
      <div className="relative flex flex-col justify-center items-center h-[70vh] bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,84,109,0.12)_0%,_transparent_65%)]" />
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

  // Owner check: parent user of this family member
  const isOwnerOfFamilyMember =
    !!currentUser?._id && String(currentUser._id) === String(profile.userId);

  return (
    <>
      {/* Top grid: avatar + styles (match UserProfileClient look) */}
      <section className="relative max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* subtle page glow */}
        <div className="pointer-events-none absolute -z-10 inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,84,109,0.12)_0%,_transparent_65%)]" />

        {/* Left Profile Card */}
        <div className="relative rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md overflow-hidden text-center self-start transition-transform duration-200 hover:shadow-lg hover:-translate-y-[1px]">
          {/* Gradient top border – match StyleCard */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          <div className="p-6 space-y-4">
            <Image
              src={avatarUrl}
              alt={profile.firstName || "Avatar"}
              width={100}
              height={100}
              className="rounded-full mx-auto border border-border object-cover"
              loading="lazy"
              sizes="100px"
            />
            <h1 className="text-2xl font-bold mt-2">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-sm text-gray-400">@{username}</p>

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

            {/* Followers link */}
            <button
              type="button"
              onClick={() => setFollowersOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition mt-2"
            >
              <span className="font-semibold">{followersTotal}</span> Followers
            </button>
          </div>
        </div>

        {/* Right Content: styles */}
        <div className="md:col-span-3 grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {profile.userStyles?.length > 0 ? (
            profile.userStyles.map((style) => (
              <StyleCard
                key={style._id || style.styleName || "style"}
                style={style}
                styleResults={
                  styleResults[(style.styleName || "").trim().toLowerCase()] ||
                  {}
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
      </section>

      {/* Bio section (full width, only if there is content) */}
      {bioHtml && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-[1px]">
            {/* Gradient top border – match StyleCard */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h8m-8 4h6M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-black dark:text-white">
                  Bio
                </h2>
              </div>
              <div
                className="prose dark:prose-invert max-w-none text-[15px] leading-7 text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: sanitize(bioHtml) }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Follow list modal for family followers */}
      <FollowListModal
        open={followersOpen}
        onClose={() => setFollowersOpen(false)}
        username={username}
        targetType="family"
      />
    </>
  );
}
