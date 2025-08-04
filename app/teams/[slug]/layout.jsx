import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import TeamWrapper from "@/components/teams/TeamWrapper";
import TeamTabs from "@/components/teams/TeamTabs";

export default async function TeamLayout({ children, params }) {
  await connectDB();
  const { slug } = await params;

  // ✅ Fetch team and current user
  const team = await Team.findOne({ teamSlug: slug });
  const currentUser = await getCurrentUser();

  if (!team) {
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

  // ✅ Fetch current user's membership if team exists
  let member = null;
  if (currentUser) {
    member = await TeamMember.findOne({
      teamId: team._id,
      userId: currentUser._id,
      familyMemberId: { $exists: false },
    });
  }

  const isManager = member?.role === "manager";
  const isCoach = member?.role === "coach";
  const isMember = member?.role === "member" || isManager;

  // ✅ Build tabs dynamically
  const tabs = [{ label: "Info", href: `/teams/${slug}` }];
  if (isMember) tabs.push({ label: "Members", href: `/teams/${slug}/members` });
  if (isManager)
    tabs.push({ label: "Settings", href: `/teams/${slug}/settings` });
  if (isManager || isCoach)
    tabs.push({
      label: "Scouting Reports",
      href: `/teams/${slug}/scouting-reports`,
    });

  const { _id, __v, createdAt, updatedAt, user, ...rest } = team.toObject();
  const safeTeam = {
    ...rest,
    user: user?.toString() || null,
  };

  return (
    <TeamWrapper team={safeTeam}>
      {/* ✅ Banner/Header */}
      <div className="bg-gray-100 dark:bg-gray-900 py-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md mb-4">
            {safeTeam.logoURL ? (
              <Image
                src={safeTeam.logoURL}
                alt={`${safeTeam.teamName} logo`}
                width={112}
                height={112}
                className="object-cover"
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

      {/* ✅ Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto">
          <TeamTabs tabs={tabs} />
        </div>
      </div>

      {/* ✅ Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </TeamWrapper>
  );
}
