"use client";

/**
 * FINAL ACCESS-CONTROL LOGIC FOR TEAM SCOUTING REPORTS
 */

function normId(v) {
  if (!v) return null;

  // Handle Mongo ObjectId correctly
  if (typeof v === "object" && typeof v.toString === "function") {
    return v.toString();
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
  if (!team || !user || !Array.isArray(reports)) return [];

  // Coaches / managers see everything
  if (isPrivileged(team, teamMembers, user)) {
    return reports;
  }

  const viewerId = String(user._id);

  // Collect all IDs this user is allowed to see reports for:
  // - themselves
  // - their family members
  const allowedAthleteIds = new Set([viewerId]);

  if (Array.isArray(user.familyMembers)) {
    user.familyMembers.forEach((fm) => {
      if (fm?._id) {
        allowedAthleteIds.add(String(fm._id));
      }
    });
  }

  return reports.filter((report) => {
    if (!Array.isArray(report.reportFor)) return false;

    return report.reportFor.some((rf) => {
      const athleteId =
        typeof rf?.athleteId === "object" && rf.athleteId?.toString
          ? rf.athleteId.toString()
          : String(rf?.athleteId);

      return allowedAthleteIds.has(athleteId);
    });
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
