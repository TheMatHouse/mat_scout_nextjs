// app/teams/[slug]/scouting-reports/debug/page.jsx
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

async function getRoleForUser(teamDoc, currentUser) {
  if (!teamDoc || !currentUser?._id) return null;

  const isOwner =
    teamDoc.user && String(teamDoc.user) === String(currentUser._id);

  if (isOwner) {
    return "manager"; // treat owner as manager for permissions
  }

  const membership = await TeamMember.findOne({
    teamId: teamDoc._id,
    userId: currentUser._id,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  if (membership?.role) {
    return String(membership.role).toLowerCase();
  }

  return null;
}

export default async function TeamScoutingReportsDebugPage({ params }) {
  await connectDB();
  const { slug } = await params; // Next 15 pattern

  const currentUser = await getCurrentUserFromCookies().catch(() => null);
  if (!currentUser) {
    return (
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Not signed in
        </h1>
        <p className="mt-2 text-sm text-gray-900 dark:text-gray-200">
          You must be signed in to view this debug page.
        </p>
      </main>
    );
  }

  const teamDoc = await Team.findOne({ teamSlug: slug }).lean();
  if (!teamDoc) {
    return (
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Team not found
        </h1>
        <p className="mt-2 text-sm text-gray-900 dark:text-gray-200">
          The team you&apos;re looking for does not exist or may have been
          deleted.
        </p>
      </main>
    );
  }

  const role = await getRoleForUser(teamDoc, currentUser);
  const isManager = role === "manager" || role === "owner" || role === "admin";
  const isCoach = role === "coach";

  if (!isManager && !isCoach) {
    return (
      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Access denied
        </h1>
        <p className="mt-2 text-sm text-gray-900 dark:text-gray-200">
          Only team managers and coaches can view this debug view of scouting
          reports.
        </p>
      </main>
    );
  }

  const reports = await TeamScoutingReport.find({ teamId: teamDoc._id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Scouting Reports – Raw Debug View
        </h1>
        <p className="mt-2 text-sm text-gray-900 dark:text-gray-200">
          This page shows the raw MongoDB documents for{" "}
          <span className="font-semibold">
            {teamDoc.teamName || "this team"}
          </span>
          . It&apos;s intended for debugging and for managers to see how entries
          look &quot;before&quot; and &quot;after&quot; enabling team password
          encryption.
        </p>
        <p className="mt-2 text-xs text-gray-900 dark:text-gray-300">
          Total reports: {reports.length}
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="rounded-md border border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-900 dark:text-gray-100">
          No scouting reports exist for this team yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <details
              key={String(report._id)}
              className="border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
            >
              <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                <span>{_summaryLine(report)}</span>
                <span className="text-xs font-normal text-gray-700 dark:text-gray-300 ml-4">
                  _id: {String(report._id)}
                </span>
              </summary>
              <pre className="px-4 pb-4 text-xs overflow-x-auto whitespace-pre bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 rounded-b-md">
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}

/**
 * Small helper to make the <summary> line more readable.
 */
function _summaryLine(report) {
  const parts = [];

  if (report.matchType) parts.push(String(report.matchType));
  if (report.athleteFirstName || report.athleteLastName) {
    parts.push(
      `${report.athleteFirstName || ""} ${report.athleteLastName || ""}`.trim()
    );
  }
  if (report.eventName) parts.push(String(report.eventName));
  if (report.createdAt) {
    try {
      const d = new Date(report.createdAt);
      parts.push(d.toLocaleDateString());
    } catch {
      // ignore
    }
  }

  if (!parts.length) return "Scouting report";
  return parts.join(" • ");
}
