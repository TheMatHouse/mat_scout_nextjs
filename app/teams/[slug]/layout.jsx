import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";
import TeamWrapper from "@/components/teams/TeamWrapper";
import TeamTabs from "@/components/teams/TeamTabs";

export default async function TeamLayout({ children, params }) {
  await connectDB();
  const { slug } = await params;

  // fetch team and current user membership
  const team = await Team.findOne({ teamSlug: slug });
  const currentUser = await getCurrentUser();
  let member = null;
  if (currentUser && team) {
    member = await TeamMember.findOne({
      teamId: team._id,
      userId: currentUser._id,
      familyMemberId: { $exists: false }, // Exclude family members
    });
  }

  const isManager = member?.role === "manager";
  const isMember = member?.role === "member" || isManager;

  // build tab list
  const tabs = [{ label: "Info", href: `/teams/${slug}` }];
  if (isMember) tabs.push({ label: "Members", href: `/teams/${slug}/members` });
  if (isManager)
    tabs.push({ label: "Settings", href: `/teams/${slug}/settings` });

  // strip mongoose internals
  const { _id, __v, createdAt, updatedAt, user, ...rest } = team.toObject();
  const safeTeam = {
    ...rest,
    user: user?.toString() || null,
  };

  return (
    <TeamWrapper team={safeTeam}>
      <div className="max-w-5xl mx-auto px-4 py-8">
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
