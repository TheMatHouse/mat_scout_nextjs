// app/teams/[slug]/layout.jsx
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import TeamProviderClient from "@/components/teams/TeamProviderClient";
import TeamTabs from "@/components/teams/TeamTabs";
import ShareMenu from "@/components/shared/ShareMenu";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export default async function TeamLayout({ children, params }) {
  await connectDB();
  const { slug } = await params; // Next 15 pattern

  const base = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    "https://matscout.com"
  ).replace(/\/+$/, "");

  // Fetch team
  const teamDoc = await Team.findOne({ teamSlug: slug }).lean();
  if (!teamDoc) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Team Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          The team you're looking for does not exist. It may have been deleted.
        </p>
        <p className="mt-4">
          If you are the team owner or a coach, you can{" "}
          <Link
            href="/teams/new"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            create a new team
          </Link>
          .
        </p>
        <Link
          href="/teams"
          className="inline-block mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Teams
        </Link>
      </div>
    );
  }

  // Current user & membership
  const currentUser = await getCurrentUserFromCookies().catch(() => null);

  // Determine role
  let normalizedRole = null;

  const isOwner =
    currentUser?._id &&
    teamDoc.user &&
    String(teamDoc.user) === String(currentUser._id);

  if (isOwner) {
    normalizedRole = "manager"; // treat owner as manager for UI auth
  } else if (currentUser?._id) {
    const membership = await TeamMember.findOne({
      teamId: teamDoc._id,
      userId: currentUser._id,
      familyMemberId: null,
    })
      .select("role familyMemberId")
      .lean();

    if (membership?.role) {
      normalizedRole = String(membership.role).toLowerCase();
    }
  }

  const isManager =
    normalizedRole === "manager" ||
    normalizedRole === "owner" ||
    normalizedRole === "admin";

  const isCoach = normalizedRole === "coach";

  const isMember =
    isOwner ||
    isManager ||
    isCoach ||
    normalizedRole === "member" ||
    normalizedRole === "player";

  // Build tabs
  const tabs = [{ label: "Info", href: `/teams/${slug}` }];

  if (isMember) {
    tabs.push({ label: "Updates", href: `/teams/${slug}/updates` });
    tabs.push({ label: "Members", href: `/teams/${slug}/members` }); // visible to all members
  }

  if (isManager || isCoach) {
    tabs.push({
      label: "Scouting Reports",
      href: `/teams/${slug}/scouting-reports`,
    });
  }

  if (isManager) {
    tabs.push({ label: "Settings", href: `/teams/${slug}/settings` });
  }

  // Serialize minimal team for client context
  const safeTeam = {
    _id: teamDoc._id?.toString(),
    teamSlug: teamDoc.teamSlug,
    teamName: teamDoc.teamName,
    user: teamDoc.user?.toString?.() || null,
    logoURL: teamDoc.logoURL || null,
    city: teamDoc.city || "",
    state: teamDoc.state || "",
    country: teamDoc.country || "",
  };

  // --- Managers list (owner + manager-role members) ---
  const managerLinks = await TeamMember.find({
    teamId: teamDoc._id,
    role: "manager",
    familyMemberId: null,
  })
    .select("userId")
    .lean();

  // collect unique userIds for managers
  const managerUserIds = Array.from(
    new Set(
      [
        ...managerLinks.map((l) => l.userId?.toString()).filter(Boolean),
        teamDoc.user?.toString?.(), // include owner
      ].filter(Boolean)
    )
  );

  const managerUsers =
    managerUserIds.length > 0
      ? await User.find({ _id: { $in: managerUserIds } })
          .select("firstName lastName username")
          .lean()
      : [];

  const managerRows = managerUsers
    .map((u) => ({
      id: u._id?.toString(),
      name:
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        "User",
      username: u.username || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Absolute URL for sharing
  const shareUrl = `${base}/teams/${safeTeam.teamSlug}`;
  const shareTitle = `${safeTeam.teamName} on MatScout`;
  const shareText = [
    safeTeam.teamName,
    safeTeam.city,
    safeTeam.state,
    safeTeam.country,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    // Restore outer <main> that your pages expect
    <main className="w-full min-w-0 overflow-x-hidden relative bg-[var(--color-bg)]">
      <TeamProviderClient team={safeTeam}>
        {/* Clamp width + prevent horizontal scroll blowouts */}
        <div className="relative w-full overflow-x-hidden">
          {/* Banner / Header with Logo */}
          <div className="bg-gray-100 dark:bg-gray-900 py-8 shadow-sm">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md mb-4">
                {safeTeam.logoURL ? (
                  <Image
                    src={cld(safeTeam.logoURL, "c_fill,w_112,h_112")}
                    alt={`${safeTeam.teamName} logo`}
                    width={112}
                    height={112}
                    className="object-cover"
                    priority={false}
                    loading="lazy"
                    sizes="112px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500">
                    No Logo
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {safeTeam.teamName}
              </h1>

              {(safeTeam.city || safeTeam.country) && (
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                  {[safeTeam.city, safeTeam.state, safeTeam.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}

              {managerRows.length > 0 && (
                <p className="text-gray-700 dark:text-gray-200 mt-1 text-sm">
                  <span className="font-medium">
                    Manager{managerRows.length > 1 ? "s" : ""}:
                  </span>{" "}
                  {managerRows.map((m, i) => (
                    <span key={m.id}>
                      {m.username ? (
                        <Link
                          href={`/family/${encodeURIComponent(m.username)}`}
                          className="hover:underline"
                        >
                          {m.name}
                        </Link>
                      ) : (
                        m.name
                      )}
                      {i < managerRows.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>

          {/* Tabs + Share (responsive, no overflow) */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 w-full">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 min-w-0">
                {/* Tabs: horizontal scroll allowed without widening page */}
                <div className="min-w-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                  <div className="inline-flex min-w-max">
                    <TeamTabs tabs={tabs} />
                  </div>
                </div>
                <div className="shrink-0 self-end md:self-auto">
                  <ShareMenu
                    url={shareUrl}
                    title={shareTitle}
                    text={shareText}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <section className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-8">
            <div className="min-w-0">{children}</div>
          </section>
        </div>
      </TeamProviderClient>
    </main>
  );
}
