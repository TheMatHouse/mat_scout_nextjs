// app/teams/[slug]/scouting-reports/logic/memberHelpers.js
"use client";

/* ---------------------------------------------------------
   Determine the role of a user for a specific team
--------------------------------------------------------- */
/**
 * team.user → team owner (implicitly “manager”)
 * teamMembers array → contains managers, coaches, members
 */
export function getUserRole(team, teamMembers, userId) {
  if (!team || !userId) return "none";

  // Team owner → highest permission
  if (String(team.user) === String(userId)) return "manager";

  // Look for membership entry
  const list = Array.isArray(teamMembers) ? teamMembers : [];
  for (const m of list) {
    const id = String(m.userId || m.familyMemberId || "");
    if (id === String(userId)) {
      return m.role || "member";
    }
  }

  return "none";
}

export function isManager(team, teamMembers, userId) {
  return getUserRole(team, teamMembers, userId) === "manager";
}

export function isCoach(team, teamMembers, userId) {
  const r = getUserRole(team, teamMembers, userId);
  return r === "coach" || r === "manager";
}

export function isPrivileged(team, teamMembers, userId) {
  const r = getUserRole(team, teamMembers, userId);
  return r === "manager" || r === "coach";
}

/* ---------------------------------------------------------
   Filter reports for MEMBERS only
--------------------------------------------------------- */
export function filterReportsForMember(reports, userId, familyIds = []) {
  if (!Array.isArray(reports)) return [];

  const famSet = new Set(familyIds.map(String));
  const u = String(userId);

  return reports.filter((r) => {
    if (!Array.isArray(r?.reportFor)) return false;

    return r.reportFor.some((rf) => {
      const id = String(rf.athleteId || "");

      // Matches user_id OR one of user's family ids
      return id === u || famSet.has(id);
    });
  });
}

/* ---------------------------------------------------------
   High-level visibility helper
--------------------------------------------------------- */
export function getVisibleReports(team, teamMembers, user, reports) {
  if (!team || !user) return [];

  const userId = String(user._id);

  // Managers + coaches see everything
  if (isPrivileged(team, teamMembers, userId)) return reports;

  // Members → filtered by reportFor
  const familyIds =
    Array.isArray(user?.familyMembers) && user.familyMembers.length
      ? user.familyMembers.map((f) => f._id)
      : [];

  return filterReportsForMember(reports, userId, familyIds);
}

/* ---------------------------------------------------------
   UI permission helpers
--------------------------------------------------------- */
export function canView(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;
  return getVisibleReports(team, teamMembers, user, [report]).length > 0;
}

export function canEdit(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;
  return isPrivileged(team, teamMembers, user._id);
}

export function canDelete(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;
  return isPrivileged(team, teamMembers, user._id);
}

export function canCreate(team, teamMembers, user) {
  if (!team || !user) return false;
  return isPrivileged(team, teamMembers, user._id);
}

/* ---------------------------------------------------------
   Build a map of userId → display name
   (Used for "Report For" column)
--------------------------------------------------------- */
export function buildMembersMap(teamMembers) {
  const map = new Map();
  (teamMembers || []).forEach((m) => {
    const id = String(m.familyMemberId || m.userId || "");
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
