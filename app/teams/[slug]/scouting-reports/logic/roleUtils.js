// app/teams/[slug]/scouting-reports/logic/roleUtils.js

/*
  Role utils for Scouting Reports (team-based)
  ------------------------------------------------------
  This file determines:
   • who can VIEW a report
   • who can EDIT a report
   • who can DELETE a report
   • which reports are visible to which members

  It must support:
    - encrypted reports
    - TeamScoutingReport model
    - "reportFor" assignments (users/family)
*/

//
// SAFE HELPERS
//
const isSameId = (a, b) => String(a || "") === String(b || "");

/*
  TeamMember structure (from /members endpoint):
    {
      userId,               // for normal user
      familyMemberId,       // for family
      role,                 // owner | manager | coach | athlete | family
      name                  // display
    }
*/

const ROLE = {
  OWNER: "owner",
  MANAGER: "manager",
  COACH: "coach",
  ATHLETE: "athlete",
  FAMILY: "family",
};

//
// Determine if user is a team owner/manager/coach
//
export function isStaff(team, user, teamMembers) {
  if (!team || !user) return false;

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );
  if (!tm) return false;

  return (
    tm.role === ROLE.OWNER || tm.role === ROLE.MANAGER || tm.role === ROLE.COACH
  );
}

//
// Determine if the user is assigned to a report via reportFor[]
//
function isAssignedToReport(report, user, teamMembers) {
  if (!report?.reportFor || !user) return false;

  return report.reportFor.some((rf) => {
    const id = String(rf.athleteId || "");
    return isSameId(id, user._id);
  });
}

//
// Visible Reports
//
export function getVisibleReports(team, teamMembers, user, reports) {
  if (!team || !Array.isArray(reports) || !user) return [];

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );

  if (!tm) return []; // not on the team → nothing

  // Staff sees all
  if (
    tm.role === ROLE.OWNER ||
    tm.role === ROLE.MANAGER ||
    tm.role === ROLE.COACH
  ) {
    return reports;
  }

  // Athletes & Family see only if assigned
  return reports.filter((r) => isAssignedToReport(r, user, teamMembers));
}

//
// Can View
//
export function canView(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );
  if (!tm) return false;

  // staff can always view
  if (
    tm.role === ROLE.OWNER ||
    tm.role === ROLE.MANAGER ||
    tm.role === ROLE.COACH
  ) {
    return true;
  }

  // athlete or family → must be assigned
  return isAssignedToReport(report, user, teamMembers);
}

//
// Can Edit
// Only owner/manager/coach
//
export function canEdit(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );
  if (!tm) return false;

  return (
    tm.role === ROLE.OWNER || tm.role === ROLE.MANAGER || tm.role === ROLE.COACH
  );
}

//
// Can Delete
// Only owner & manager
//
export function canDelete(report, team, teamMembers, user) {
  if (!report || !team || !user) return false;

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );
  if (!tm) return false;

  return tm.role === ROLE.OWNER || tm.role === ROLE.MANAGER;
}

//
// Can Create reports
// Owner / Manager / Coach
//
export function canCreate(team, teamMembers, user) {
  if (!team || !user) return false;

  const tm = teamMembers.find(
    (m) => isSameId(m.userId, user._id) || isSameId(m.familyMemberId, user._id)
  );
  if (!tm) return false;

  return (
    tm.role === ROLE.OWNER || tm.role === ROLE.MANAGER || tm.role === ROLE.COACH
  );
}
