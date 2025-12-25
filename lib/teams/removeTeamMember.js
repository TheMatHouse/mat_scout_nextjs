import mongoose from "mongoose";
import TeamMember from "@/models/teamMemberModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

/**
 * Remove a team member (user OR family member) safely.
 *
 * Rules:
 * - If removing a USER:
 *   - delete only TeamMember where userId === X AND familyMemberId == null
 * - If removing a FAMILY MEMBER:
 *   - delete only TeamMember where familyMemberId === Y
 * - Clean up scouting reports:
 *   - if reportFor contains ONLY this id → delete report
 *   - else → pull id from reportFor
 * - Delete coach notes for that entity
 */
export async function removeTeamMember({ teamId, teamMemberId }) {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // ------------------------------------------------------------
      // Load TeamMember row
      // ------------------------------------------------------------
      const tm = await TeamMember.findOne({
        _id: teamMemberId,
        teamId,
      }).session(session);

      if (!tm) {
        throw new Error("Team member not found");
      }

      const isFamilyMember = !!tm.familyMemberId;

      const targetUserId = tm.userId ? String(tm.userId) : null;
      const targetFamilyMemberId = tm.familyMemberId
        ? String(tm.familyMemberId)
        : null;

      // ------------------------------------------------------------
      // Cleanup scouting reports
      // ------------------------------------------------------------
      const reports = await TeamScoutingReport.find({
        teamId,
        reportFor: isFamilyMember ? targetFamilyMemberId : targetUserId,
      }).session(session);

      for (const report of reports) {
        const ids = report.reportFor.map(String);

        if (ids.length === 1) {
          // Only this athlete → delete entire report
          await TeamScoutingReport.deleteOne({ _id: report._id }, { session });
        } else {
          // Remove just this athlete
          await TeamScoutingReport.updateOne(
            { _id: report._id },
            {
              $pull: {
                reportFor: isFamilyMember ? targetFamilyMemberId : targetUserId,
              },
            },
            { session }
          );
        }
      }

      // ------------------------------------------------------------
      // Cleanup coach notes
      // ------------------------------------------------------------
      if (isFamilyMember) {
        await CoachMatchNote.deleteMany(
          {
            teamId,
            familyMemberId: targetFamilyMemberId,
          },
          { session }
        );
      } else {
        await CoachMatchNote.deleteMany(
          {
            teamId,
            userId: targetUserId,
          },
          { session }
        );
      }

      // ------------------------------------------------------------
      // Delete ONLY the intended TeamMember row
      // ------------------------------------------------------------
      if (isFamilyMember) {
        await TeamMember.deleteOne(
          {
            _id: tm._id,
            familyMemberId: targetFamilyMemberId,
          },
          { session }
        );
      } else {
        await TeamMember.deleteOne(
          {
            _id: tm._id,
            userId: targetUserId,
            familyMemberId: null,
          },
          { session }
        );
      }
    });
  } finally {
    session.endSession();
  }
}
