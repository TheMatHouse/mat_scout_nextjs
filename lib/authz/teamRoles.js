// lib/authz/teamRoles.js
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

/**
 * Ensure the user has one of the allowed roles on the team identified by slug.
 * - Owner is treated as "manager".
 * - Otherwise, check TeamMember (teamId + userId, familyMemberId: null).
 */
export async function requireTeamRole(
  userId,
  slug,
  allowed = ["manager", "coach"]
) {
  if (!userId) return { ok: false, status: 401, reason: "Not signed in" };

  // Your Team model uses teamSlug
  const team = await Team.findOne(
    { teamSlug: slug },
    { _id: 1, user: 1 }
  ).lean();
  if (!team) return { ok: false, status: 404, reason: "Team not found" };

  // Owner shortcut → treat as manager
  if (team.user && String(team.user) === String(userId)) {
    const role = "manager";
    if (!allowed.includes(role))
      return { ok: false, status: 403, reason: "Insufficient role" };
    return { ok: true, teamId: team._id, role };
  }

  // Regular membership
  const tm = await TeamMember.findOne(
    { teamId: team._id, userId: userId, familyMemberId: null },
    { role: 1 }
  ).lean();

  if (!tm?.role) return { ok: false, status: 403, reason: "Not a team member" };

  const role = String(tm.role).toLowerCase();
  if (!allowed.includes(role))
    return { ok: false, status: 403, reason: "Insufficient role" };

  return { ok: true, teamId: team._id, role };
}

/** Managers can delete anything; coaches can delete only their own match notes */
export function canDelete(role, ownerId, userId, scope = "event") {
  if (role === "manager") return true;
  if (role === "coach")
    return scope === "match" && String(ownerId) === String(userId);
  return false;
}
