import Link from "next/link";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";
import TeamWrapper from "@/components/teams/TeamWrapper";
import TeamTabs from "@/components/teams/TeamTabs";

export default async function TeamLayout({ children, params }) {
  await connectDB();
  const { slug } = await params;

  // ✅ Fetch team and current user
  const team = await Team.findOne({ teamSlug: slug });
  const currentUser = await getCurrentUser();

  // ✅ If team does not exist, render custom "Team Not Found" page
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
      familyMemberId: { $exists: false }, // Exclude family members
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

  // ✅ Remove Mongoose internals
  const { _id, __v, createdAt, updatedAt, user, ...rest } = team.toObject();
  const safeTeam = {
    ...rest,
    user: user?.toString() || null,
  };

  return (
    <TeamWrapper team={safeTeam}>
      <div className="max-w-8xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
            {safeTeam.teamName}
          </h1>
          {safeTeam.logoURL && (
            <img
              src={safeTeam.logoURL}
              alt={`${safeTeam.teamName} Logo`}
              className="mx-auto mt-4 w-32 h-32 rounded-full border-2 border-ms-blue object-cover shadow-lg"
            />
          )}
        </div>

        {/* Tabs */}
        <TeamTabs tabs={tabs} />

        {/* Content Container */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          {children}
        </div>
      </div>
    </TeamWrapper>
  );
}
