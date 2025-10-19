// components/profile/UserProfileClient.jsx
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

// Minimal sanitizer for display HTML (strip scripts & inline handlers)
function sanitize(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

// ---- styles payload normalizers ----
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

export default function UserProfileClient({ username, userId }) {
  const [profileUser, setProfileUser] = useState();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // follow counts + status + modal visibility
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [openList, setOpenList] = useState(null); // 'followers' | 'following' | null

  // Bio (display-only)
  const [bioHtml, setBioHtml] = useState("");

  // Family (display-only)
  const [familyList, setFamilyList] = useState([]);

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

  const handleFollowChange = useCallback(
    async (nowFollowing) => {
      setFollowCounts((c) => ({
        ...c,
        followers: Math.max(0, (c.followers || 0) + (nowFollowing ? 1 : -1)),
      }));
      setIsFollowing(!!nowFollowing);
      refreshCounts();
    },
    [refreshCounts]
  );

  // 1) Load base profile (may or may not include userStyles)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setApiError("");
      setLoading(true);

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          cache: "no-store",
        });

        if (res.status === 404) {
          if (!cancelled) setProfileUser(null);
        } else if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          console.error(
            "GET /api/users/[username] failed:",
            res.status,
            bodyText
          );
          if (!cancelled) {
            setApiError("Sorry, we couldn’t load this profile right now.");
            setProfileUser(undefined);
          }
        } else {
          const data = await res.json().catch(() => ({}));
          const baseUser = data?.user || undefined;

          const userStyles = extractStyles(baseUser?.userStyles).map(
            normalizeStyleName
          );
          const matchReports = Array.isArray(baseUser?.matchReports)
            ? baseUser.matchReports
            : [];

          if (!cancelled) {
            setProfileUser({ ...baseUser, userStyles, matchReports });
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (!cancelled) {
          setApiError("Sorry, we couldn’t load this profile right now.");
          setProfileUser(undefined);
        }
      }

      // Viewer (never block)
      try {
        const viewerRes = await fetch("/api/auth/me", { cache: "no-store" });
        const viewerData = viewerRes.ok ? await viewerRes.json() : null;
        if (!cancelled) setCurrentUser(viewerData?.user || null);
      } catch {
        if (!cancelled) setCurrentUser(null);
      }

      refreshCounts();

      // Bio — fire and forget
      (async () => {
        try {
          const res = await fetch(
            `/api/users/${encodeURIComponent(username)}/bio`,
            { cache: "no-store" }
          );
          if (!res.ok) {
            if (!cancelled) setBioHtml("");
            return;
          }
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setBioHtml(sanitize(data?.bioHtml || ""));
        } catch {
          if (!cancelled) setBioHtml("");
        }
      })();
    })()
      .catch(() => {
        // handled above
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, refreshCounts]);

  // 2) Ensure styles are loaded even if the profile payload didn't include them
  useEffect(() => {
    let cancelled = false;

    async function loadStylesIfMissing() {
      if (
        !profileUser ||
        (Array.isArray(profileUser.userStyles) && profileUser.userStyles.length)
      ) {
        return;
      }

      // First try a public styles endpoint (if you have it)
      try {
        const r = await fetch(
          `/api/users/${encodeURIComponent(username)}/styles`,
          { cache: "no-store" }
        );
        if (r.ok) {
          const data = await r.json().catch(() => ({}));
          const arr = extractStyles(data).map(normalizeStyleName);
          if (!cancelled && arr.length) {
            setProfileUser((prev) =>
              prev ? { ...prev, userStyles: arr } : prev
            );
            return;
          }
        }
      } catch {}

      // Fallback: owner’s dashboard endpoint (works when viewing your own profile)
      if (!userId) return;
      try {
        const r2 = await fetch(
          `/api/dashboard/${encodeURIComponent(userId)}/userStyles`,
          { cache: "no-store", credentials: "same-origin" }
        );
        if (r2.ok) {
          const data2 = await r2.json().catch(() => ({}));
          const arr2 = extractStyles(data2).map(normalizeStyleName);
          if (!cancelled && arr2.length) {
            setProfileUser((prev) =>
              prev ? { ...prev, userStyles: arr2 } : prev
            );
          }
        }
      } catch {}
    }

    loadStylesIfMissing();

    return () => {
      cancelled = true;
    };
  }, [profileUser, username, userId]);

  // 3) Load family list (separate; not blocking)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/family`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!cancelled) setFamilyList([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const DEFAULT =
          "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
        const rows = (data?.results || []).map((m) => {
          let base = m.avatar || "";
          if (m.avatarType === "google") base = m.googleAvatar || base;
          if (m.avatarType === "facebook") base = m.facebookAvatar || base;
          const raw = (base || "").trim() || DEFAULT;
          const avatar = cld(raw, "w_64,h_64,c_fill,g_auto,dpr_auto") || raw;
          const displayName =
            [m.firstName, m.lastName].filter(Boolean).join(" ") ||
            m.username ||
            "Family Member";
          return { username: m.username, displayName, avatar };
        });
        if (!cancelled) setFamilyList(rows);
      } catch {
        if (!cancelled) setFamilyList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Spinner: only check loading now
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

  // 404 page
  if (profileUser === null) return notFound();

  // Soft error (500, etc.)
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
      {/* Top grid: avatar + styles */}
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
              alt={profileUser.firstName || "User avatar"}
              width={100}
              height={100}
              className="rounded-full mx-auto border border-border object-cover"
              loading="lazy"
              sizes="100px"
            />
            <h1 className="text-2xl font-bold mt-2">
              {profileUser.firstName} {profileUser.lastName}
            </h1>
            <p className="text-sm text-gray-400">@{profileUser.username}</p>

            {/* Follow/Unfollow for other users */}
            {currentUser && currentUser.username !== profileUser.username && (
              <div className="mt-2">
                <FollowButton
                  username={profileUser.username}
                  initialIsFollowing={isFollowing}
                  onChange={handleFollowChange}
                />
              </div>
            )}

            {/* Stat pills */}
            <div className="mt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setOpenList("following")}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="View who they follow"
              >
                <span className="font-semibold">{followCounts.following}</span>{" "}
                Following
              </button>
              <button
                type="button"
                onClick={() => setOpenList("followers")}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="View their followers"
              >
                <span className="font-semibold">{followCounts.followers}</span>{" "}
                Followers
              </button>
            </div>

            {/* Teams */}
            {profileUser.teams?.length > 0 && (
              <div className="text-left space-y-2 mt-4">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  Teams
                </h3>
                <ul className="space-y-2">
                  {profileUser.teams.map((team) => {
                    const rawLogo = team.logoURL || "/default-team.png";
                    const logoUrl =
                      cld(rawLogo, "w_64,h_64,c_fill,g_auto,dpr_auto") ||
                      rawLogo;

                    return (
                      <li
                        key={team._id}
                        className="flex items-center gap-3"
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

            {/* Family */}
            {familyList.length > 0 && (
              <div className="text-left space-y-2 mt-4">
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  Family
                </h3>
                <ul className="space-y-2">
                  {familyList.map((m) => (
                    <li
                      key={m.username}
                      className="flex items-center gap-3"
                    >
                      <Image
                        src={m.avatar}
                        alt={m.displayName}
                        width={28}
                        height={28}
                        className="rounded-full border border-border object-cover"
                        loading="lazy"
                        sizes="28px"
                      />
                      <Link
                        href={`/family/${encodeURIComponent(m.username)}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {m.displayName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Settings link for own profile */}
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
        </div>

        {/* Right Content: styles */}
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

      {/* Bio section (full width, only if there is content) */}
      {bioHtml && (
        <section className="max-w-7xl mx-auto px_4 pb-10">
          <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-[1px]">
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
              {/* Render bio HTML inside a scoped wrapper so bullets always show */}
              <div
                className="bio-content prose dark:prose-invert max-w-none text-[15px] leading-7 text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: sanitize(bioHtml) }}
              />
            </div>
          </div>
        </section>
      )}

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

      {/* ✅ Scoped styles so <ul>/<ol>/<li> render bullets in the Bio only */}
      <style
        jsx
        global
      >{`
        .bio-content ul {
          list-style: disc !important;
          list-style-position: outside !important;
          padding-left: 1.25rem !important;
          margin: 0 0 12px !important;
        }
        .bio-content ol {
          list-style: decimal !important;
          list-style-position: outside !important;
          padding-left: 1.25rem !important;
          margin: 0 0 12px !important;
        }
        .bio-content ul ul {
          list-style: circle !important;
          margin: 4px 0 8px !important;
        }
        .bio-content li {
          display: list-item !important;
          margin: 4px 0 !important;
          line-height: 1.5 !important;
        }
      `}</style>
    </>
  );
}
