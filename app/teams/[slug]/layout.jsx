// app/teams/[slug]/layout.jsx
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import TeamProviderClient from "@/components/teams/TeamProviderClient";
import TeamTabs from "@/components/teams/TeamTabs";

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
  const { slug } = params;

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

  // Current user & membership (count both direct and family-member memberships)
  const currentUser = await getCurrentUserFromCookies().catch(() => null);

  let member = null;
  if (currentUser?._id) {
    // Do NOT exclude familyMemberId — parents with family athletes should still be “members”
    member = await TeamMember.findOne({
      teamId: teamDoc._id,
      userId: currentUser._id,
    })
      .select("role familyMemberId")
      .lean();
  }

  const role = (member?.role || "").toLowerCase();
  const isManager = role === "manager";
  const isCoach = role === "coach";
  const isMember = isManager || isCoach || role === "member";

  // Build tabs dynamically
  const tabs = [{ label: "Info", href: `/teams/${slug}` }];

  // All team members (member/coach/manager) can see Updates
  if (isMember) {
    tabs.push({ label: "Updates", href: `/teams/${slug}/updates` });
  }

  // Only coaches/managers can see Members + Scouting
  if (isManager || isCoach) {
    tabs.push({ label: "Members", href: `/teams/${slug}/members` });
    tabs.push({
      label: "Scouting Reports",
      href: `/teams/${slug}/scouting-reports`,
    });
  }

  // Only managers can see Settings
  if (isManager) {
    tabs.push({ label: "Settings", href: `/teams/${slug}/settings` });
  }

  // Serialize team for client context
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

  return (
    <TeamProviderClient team={safeTeam}>
      {/* Banner / Header with Logo */}
      <div className="bg-gray-100 dark:bg-gray-900 py-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md mb-4">
            {safeTeam.logoURL ? (
              <Image
                src={cld(safeTeam.logoURL, "w_224,h_224,c_fill,g_auto")}
                alt={`${safeTeam.teamName} logo`}
                width={112}
                height={112}
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500">
                No Logo
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {safeTeam.teamName}
          </h1>
          {(safeTeam.city || safeTeam.country) && (
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {[safeTeam.city, safeTeam.state, safeTeam.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto">
          <TeamTabs tabs={tabs} />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </TeamProviderClient>
  );
}
