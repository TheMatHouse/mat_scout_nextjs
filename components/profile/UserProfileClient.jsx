"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import StyleCard from "@/components/profile/StyleCard";
import { notFound } from "next/navigation";
import Spinner from "../shared/Spinner";
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

// styles payload normalizers
const looksLikeStyle = (x) =>
  x &&
  typeof x === "object" &&
  (typeof x.styleName === "string" ||
    typeof x.name === "string" ||
    (x.style && typeof x.style.name === "string"));

const extractStyles = (payload) => {
  if (Array.isArray(payload) && payload.every(looksLikeStyle)) return payload;
  if (
    payload?.styles &&
    Array.isArray(payload.styles) &&
    payload.styles.every(looksLikeStyle)
  )
    return payload.styles;
  if (
    payload?.userStyles &&
    Array.isArray(payload.userStyles) &&
    payload.userStyles.every(looksLikeStyle)
  )
    return payload.userStyles;
  if (
    payload?.data &&
    Array.isArray(payload.data) &&
    payload.data.every(looksLikeStyle)
  )
    return payload.data;
  return [];
};

const normalizeStyleName = (s) => {
  if (!s) return s;
  const styleName = s.styleName || s.name || s.style?.name || "";
  return { ...s, styleName };
};

export default function UserProfileClient({ username }) {
  const [profileUser, setProfileUser] = useState();
  const [currentUser, setCurrentUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // follow counts + status + modal visibility
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [openList, setOpenList] = useState(null); // 'followers' | 'following' | null

  // Small helper to refetch counts/status for THIS profile
  const refreshCounts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/follow`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      setFollowCounts(json?.counts || { followers: 0, following: 0 });
      setIsFollowing(!!json?.isFollowing);
    } catch {
      /* ignore */
    }
  }, [username]);

  // When follow state changes (from the button), optimistically bump THIS profile's followers,
  // then sync from server (just like your FamilyProfileClient)
  const handleFollowChange = useCallback(
    async (nowFollowing) => {
      // You followed/unfollowed *this* user → their Followers count changes
      setFollowCounts((c) => ({
        ...c,
        followers: Math.max(0, (c.followers || 0) + (nowFollowing ? 1 : -1)),
      }));
      setIsFollowing(!!nowFollowing);
      await refreshCounts();
    },
    [refreshCounts]
  );

  // Initial data load
  useEffect(() => {
    async function fetchData() {
      setApiError("");
      try {
        // Profile
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          setProfileUser(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          console.error(
            "GET /api/users/[username] failed:",
            res.status,
            bodyText
          );
          setApiError("Sorry, we couldn’t load this profile right now.");
          setProfileUser(undefined);
        } else {
          const data = await res.json().catch(() => ({}));
          const baseUser = data?.user || undefined;

          // normalize styles
          const userStyles = extractStyles(baseUser?.userStyles).map(
            normalizeStyleName
          );
          const matchReports = Array.isArray(baseUser?.matchReports)
            ? baseUser.matchReports
            : [];

          setProfileUser({ ...baseUser, userStyles, matchReports });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setApiError("Sorry, we couldn’t load this profile right now.");
        setProfileUser(undefined);
      }

      // Viewer
      try {
        const viewerRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (viewerRes.ok) {
          const viewerData = await viewerRes.json();
          setCurrentUser(viewerData.user || null);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }

      // Counts + status
      await refreshCounts();

      setLoading(false);
    }

    fetchData();
  }, [username, refreshCounts]);

  if (loading || currentUser === undefined) {
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
  if (profileUser === null) return notFound();

  // Soft error (500 etc)
  if (!profileUser) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-20">
        <h1 className="text-2xl font-semibold mb-3">Profile unavailable</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {apiError || "Please try again later."}
        </p>
      </div>
    );
  }

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

  // Build W/L per style from matchReports
  const styleResults = {};
  if (Array.isArray(profileUser.userStyles)) {
    profileUser.userStyles.forEach((style) => {
      const key = (style.styleName || "").trim().toLowerCase();
      if (!key) return;
      const reports =
        profileUser.matchReports?.filter(
          (r) => (r.matchType || "").trim().toLowerCase() === key
        ) || [];
      const wins = reports.filter((r) => r.result === "Won").length || 0;
      const losses = reports.filter((r) => r.result === "Lost").length || 0;
      styleResults[key] = { Wins: wins, Losses: losses };
    });
  }

  // Avatar (guaranteed non-empty)
  const EMERGENCY_DEFAULT =
    "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

  const typeUrl = (() => {
    if (profileUser?.avatarType === "google") return profileUser?.googleAvatar;
    if (profileUser?.avatarType === "facebook")
      return profileUser?.facebookAvatar;
    return profileUser?.avatar;
  })();

  const selectedUrl = [typeUrl, profileUser?.avatar, EMERGENCY_DEFAULT]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);

  const avatarUrl =
    cld(selectedUrl, "w_200,h_200,c_fill,g_auto,dpr_auto") || selectedUrl;

  return (
    <>
      <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-xl shadow border border-border p-6 text-center space-y-4 self-start">
          <Image
            src={avatarUrl}
            alt={profileUser.firstName || "User avatar"}
            width={100}
            height={100}
            className="rounded-full mx-auto border border-border object-cover"
            loading="lazy"
            sizes="100px"
          />
          <h1 className="text-xl font-bold mt-4">
            {profileUser.firstName} {profileUser.lastName}
          </h1>
          <p className="text-sm text-black dark:text-white">
            @{profileUser.username}
          </p>

          {/* Social: Follow/Unfollow button for other people's profiles */}
          {currentUser && currentUser.username !== profileUser.username && (
            <div className="mt-2">
              <FollowButton
                username={profileUser.username}
                initialIsFollowing={isFollowing}
                // ⬇️ This is the only addition you need
                onChange={handleFollowChange}
              />
            </div>
          )}

          {/* Social: counts + open list */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setOpenList("following")}
              className="text-sm hover:underline"
              title="View who they follow"
            >
              <span className="font-semibold">{followCounts.following}</span>{" "}
              Following
            </button>
            <button
              type="button"
              onClick={() => setOpenList("followers")}
              className="text-sm hover:underline"
              title="View their followers"
            >
              <span className="font-semibold">{followCounts.followers}</span>{" "}
              Followers
            </button>
          </div>

          {/* Teams */}
          {profileUser.teams?.length > 0 && (
            <div className="text-left space-y-2 mt-6">
              <h3 className="text-sm font-semibold text-black dark:text-white">
                Teams
              </h3>
              <ul className="space-y-1">
                {profileUser.teams.map((team) => {
                  const rawLogo = team.logoURL || "/default-team.png";
                  const logoUrl =
                    cld(rawLogo, "w_64,h_64,c_fill,g_auto,dpr_auto") || rawLogo;

                  return (
                    <li
                      key={team._id}
                      className="flex items-center gap-2"
                    >
                      <Image
                        src={logoUrl}
                        alt={team.teamName}
                        width={32}
                        height={32}
                        className="rounded-full border border-border object-cover"
                        loading="lazy"
                        sizes="32px"
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

          {/* If it's my profile, quick link back to settings */}
          {currentUser?.username === profileUser.username && (
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                href="/dashboard/settings"
                className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Go to Dashboard → Settings
              </Link>
            </div>
          )}
        </div>

        {/* Right Content */}
        <div className="md:col-span-3 grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {profileUser.userStyles?.length > 0 ? (
            profileUser.userStyles.map((style) => (
              <StyleCard
                key={style._id || style.styleName || "style"}
                style={style}
                styleResults={
                  styleResults[(style.styleName || "").trim().toLowerCase()] ||
                  {}
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

      {/* Follow lists */}
      <FollowListModal
        open={openList === "followers"}
        onClose={() => setOpenList(null)}
        username={profileUser.username}
        targetType="user"
        list="followers"
      />
      <FollowListModal
        open={openList === "following"}
        onClose={() => setOpenList(null)}
        username={profileUser.username}
        targetType="user"
        list="following"
      />
    </>
  );
}
