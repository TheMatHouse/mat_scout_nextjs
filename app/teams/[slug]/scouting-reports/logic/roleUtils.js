"use client";

/**
 * FINAL ACCESS-CONTROL LOGIC FOR TEAM SCOUTING REPORTS
 */

function normId(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    return String(v._id || v.id || v.value || "");
  }
  return String(v);
}

/* ---------------------------------------------------------
   Resolve the user's role within the team
--------------------------------------------------------- */
export function getUserRole(team, teamMembers, user) {
  if (!team || !user) return "none";

  const userId = String(user._id);

  // TEAM OWNER
  if (String(team.user) === userId) {
    return "manager";
  }

  if (Array.isArray(teamMembers)) {
    for (const m of teamMembers) {
      // Direct membership (no familyMemberId)
      if (String(m.userId) === userId && !m.familyMemberId) {
        return m.role || "member";
      }

      // Parent inheriting access via child → ALWAYS member
      if (String(m.userId) === userId && m.familyMemberId) {
        return "member";
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
   Determine which reports the user is allowed to see
--------------------------------------------------------- */
export function getVisibleReports(team, teamMembers, user, reports) {
  if (
    !team ||
    !user ||
    !Array.isArray(reports) ||
    !Array.isArray(teamMembers)
  ) {
    return [];
  }

  // Staff see everything
  if (isPrivileged(team, teamMembers, user)) {
    return reports;
  }

  const userId = normId(user._id);

  const myFamilyMemberIds = teamMembers
    .filter((m) => normId(m.userId) === userId && m.familyMemberId)
    .map((m) => normId(m.familyMemberId));

  return reports.filter((r) => {
    const reportUserId = normId(r.userId);
    const reportFamilyId = normId(r.familyMemberId);

    // Must belong to THIS parent
    if (reportUserId !== userId) return false;

    // Adult member report
    if (!reportFamilyId) return true;

    // Child report — must be MY child
    return myFamilyMemberIds.includes(reportFamilyId);
  });
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
