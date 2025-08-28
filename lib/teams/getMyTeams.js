// lib/teams/getMyTeams.js
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

/**
 * Returns ALL teams the user owns/admins/created OR is a member of,
 * and attaches a normalized role per team:
 *  - role from TeamMember if present
 *  - fallback "manager" if the user owns/admins the team but has no TeamMember row
 *
 * @param {string|ObjectId} userId
 * @param {object} opts
 * @param {string} [opts.select] - Mongoose select fields for Team fetch
 * @returns {Promise<Array<{_id:string, teamName, teamSlug, logoURL, city, state, country, description?, role:string}>>}
 */
export async function getMyTeams(userId, opts = {}) {
  if (!userId) return [];

  const SELECT_FIELDS =
    opts.select ?? "teamName teamSlug logoURL city state country description";

  await connectDB();

  // 1) Membership links (carry role)
  const links = await TeamMember.find({ userId }).select("teamId role").lean();

  const roleByTeamId = new Map(
    links.map((l) => [String(l.teamId), (l.role || "member").toLowerCase()])
  );

  // 2) Teams user owns/admins/created (cover historical fields)
  const owned = await Team.find({
    $or: [
      { user: userId }, // common owner field in your models
      { ownerId: userId },
      { createdBy: userId },
      { admins: userId },
      { adminIds: userId },
      { managers: userId },
      { managerIds: userId },
    ],
  })
    .select("_id")
    .lean();

  // Owner/admin should at least be "manager" if no explicit TeamMember row
  for (const t of owned) {
    const id = String(t._id);
    if (!roleByTeamId.has(id)) roleByTeamId.set(id, "manager");
  }

  // 3) Union of member-of + owned/admin
  const allIds = Array.from(
    new Set([
      ...links.map((l) => String(l.teamId)),
      ...owned.map((t) => String(t._id)),
    ])
  );
  if (allIds.length === 0) return [];

  // 4) Fetch teams once; attach role
  const teams = await Team.find({ _id: { $in: allIds } })
    .select(SELECT_FIELDS)
    .sort({ teamName: 1 })
    .lean();

  return teams.map((t) => ({
    ...t,
    _id: String(t._id),
    role: roleByTeamId.get(String(t._id)) || "", // empty string if unknown
  }));
}

export default getMyTeams;
