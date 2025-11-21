"use client";

/**
 * FINAL ACCESS-CONTROL LOGIC FOR TEAM SCOUTING REPORTS
 *
 * Correct Rules:
 * --------------------------------------------------------
 *  • Team Owner  → team.user field → ALWAYS "manager"
 *  • TeamMember.role → "manager" | "coach" | "member"
 *  • Privileged Roles → manager + coach
 *  • Members → see ONLY:
 *        - reports where reportFor[].athleteId == user._id
 *        - OR reportFor matches any familyMemberId
 * --------------------------------------------------------
 */

/* ---------------------------------------------------------
   Resolve the user's role within the team
--------------------------------------------------------- */
export function getUserRole(team, teamMembers, user) {
  if (!team || !user) return "none";

  const userId = String(user._id);

  // TEAM OWNER (team.user is always the owner)
  if (String(team.user) === userId) {
    return "manager";
  }

  // TEAM MEMBERS COLLECTION
  if (Array.isArray(teamMembers)) {
    for (const m of teamMembers) {
      const id = String(m.userId || m.familyMemberId || "");
      if (id === userId) {
        return m.role || "member";
      }
    }
  }

  return "none";
}

/* ---------------------------------------------------------
   Role helpers
--------------------------------------------------------- */
export function isManager(team, teamMembers, user) {
  return getUserRole(team, teamMembers, user) === "manager";
}

export function isCoach(team, teamMembers, user) {
  const role = getUserRole(team, teamMembers, user);
  return role === "coach" || role === "manager";
}

export function isPrivileged(team, teamMembers, user) {
  const r = getUserRole(team, teamMembers, user);
  return r === "manager" || r === "coach";
}

/* ---------------------------------------------------------
   MEMBER REPORT VISIBILITY
--------------------------------------------------------- */
/**
 * A member can only see reports where:
 *   - report.reportFor[].athleteId matches their userId
 *   - OR matches ANY of their familyMemberIds
 */
export function filterReportsForMember(reports, user) {
  if (!Array.isArray(reports) || !user) return [];

  const userId = String(user._id);
  const familyIds = Array.isArray(user.familyMembers)
    ? user.familyMembers.map((f) => String(f._id))
    : [];

  const allowedSet = new Set([userId, ...familyIds]);

  return reports.filter((r) => {
    if (!Array.isArray(r?.reportFor)) return false;

    return r.reportFor.some((rf) => allowedSet.has(String(rf.athleteId || rf)));
  });
}

/* ---------------------------------------------------------
   Determine which reports the user is allowed to see
--------------------------------------------------------- */
export function getVisibleReports(team, teamMembers, user, reports) {
  if (!team || !user || !Array.isArray(reports)) return [];

  // Managers & Coaches get ALL reports
  if (isPrivileged(team, teamMembers, user)) {
    return reports;
  }

  // Members get filtered reports only
  return filterReportsForMember(reports, user);
}

/* ---------------------------------------------------------
   UI Permissions
--------------------------------------------------------- */
export function canCreate(team, teamMembers, user) {
  return isPrivileged(team, teamMembers, user);
}

export function canEdit(report, team, teamMembers, user) {
  return isPrivileged(team, teamMembers, user);
}

export function canDelete(report, team, teamMembers, user) {
  return isPrivileged(team, teamMembers, user);
}

export function canView(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;
  const visible = getVisibleReports(team, teamMembers, user, [report]);
  return visible.length > 0;
}

/* ---------------------------------------------------------
   Build a map of userId → display name
   Useful for "Report For" column in tables
--------------------------------------------------------- */
export function buildMembersMap(teamMembers) {
  const map = new Map();
  (teamMembers || []).forEach((m) => {
    const id = String(m.userId || m.familyMemberId || "");
    if (!id) return;

    const name =
      m.name ||
      m.username ||
      `${m.firstName || ""} ${m.lastName || ""}`.trim() ||
      "Unknown";

    map.set(id, name);
  });

  return map;
}
