import TeamScoutingReport from "@/models/teamScoutingReportModel";

/**
 * Remove an athlete from team scouting reports.
 * - Soft-deletes reports where this athlete is the only target
 * - Otherwise removes only that athlete from reportFor
 */
export async function reconcileScoutingReportsForRemovedAthlete({
  teamId,
  athleteId,
  athleteType, // "user" | "family"
  session = null,
}) {
  const reports = await TeamScoutingReport.find(
    {
      teamId,
      deletedAt: null,
      reportFor: {
        $elemMatch: {
          athleteId,
          athleteType,
        },
      },
    },
    null,
    { session }
  );

  const now = new Date();

  for (const report of reports) {
    if (report.reportFor.length === 1) {
      // Only athlete → soft delete report
      report.deletedAt = now;
      await report.save({ session });
    } else {
      // Multiple athletes → remove only this one
      await TeamScoutingReport.updateOne(
        { _id: report._id },
        {
          $pull: {
            reportFor: {
              athleteId,
              athleteType,
            },
          },
        },
        { session }
      );
    }
  }
}
