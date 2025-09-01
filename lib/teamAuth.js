// lib/teamAuth.js
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export async function getTeamAndRole({ slug, userId }) {
  const team = await Team.findOne({ teamSlug: slug })
    .select("_id teamSlug teamName user")
    .lean();
  if (!team) return { team: null, role: null, isOwner: false };

  const isOwner = team.user && String(team.user) === String(userId);
  if (isOwner) {
    // Treat owner as "manager" for permissions
    return { team, role: "manager", isOwner: true };
  }

  const link = await TeamMember.findOne({
    teamId: team._id,
    userId,
  })
    .select("role")
    .lean();

  const role = (link?.role || "").toLowerCase();
  return { team, role, isOwner: false };
}

export function canManage(role) {
  role = (role || "").toLowerCase();
  return role === "manager" || role === "coach";
}
