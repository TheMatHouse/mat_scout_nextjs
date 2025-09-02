// Normalize any id-like thing to a string.
const asId = (v) =>
  v && (v._id || v.id || v.userId || v)
    ? String(v._id || v.id || v.userId || v)
    : "";

/**
 * Derive the current user's membership/role in a team.
 * Supports multiple shapes:
 * - team.ownerId (string/ObjectId)
 * - team.managers: [string|ObjectId|{_id}|{userId}]
 * - team.memberships or team.members: [{ userId, role, status }]
 */
export function deriveMyTeamRole(team, userId) {
  const uid = String(userId || "");
  if (!uid || !team) return { isMember: false, role: null, status: null };

  // Owner
  if (team.ownerId && asId(team.ownerId) === uid) {
    return { isMember: true, role: "owner", status: "active" };
  }

  // Manager (array can contain ids or objects)
  const managers = Array.isArray(team.managers) ? team.managers : [];
  const isManager = managers.some((m) => asId(m) === uid);
  if (isManager) {
    return { isMember: true, role: "manager", status: "active" };
  }

  // Regular member via TeamMember docs
  const members = Array.isArray(team.memberships)
    ? team.memberships
    : Array.isArray(team.members)
    ? team.members
    : [];
  const rec = members.find((m) => asId(m) === uid);
  if (rec) {
    const status = rec.status || "active";
    const role = rec.role || "member";
    // consider everything except explicit rejection as "member"
    const isMember = status !== "rejected";
    return { isMember, role, status };
  }

  return { isMember: false, role: null, status: null };
}
