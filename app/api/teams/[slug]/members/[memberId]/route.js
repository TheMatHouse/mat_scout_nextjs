export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import CoachEntry from "@/models/coachEntryModel";

import { reconcileScoutingReportsForRemovedAthlete } from "@/lib/teams/reconcileScoutingReportsForRemovedAthlete";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "PATCH, OPTIONS",
    },
  });
}

/* ============================================================
   PATCH — update role OR remove member (soft delete)
============================================================ */
export async function PATCH(request, { params }) {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const actor = await getCurrentUser();
    if (!actor) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, memberId } = await params;
    const { role } = await request.json();

    const allowedRoles = ["pending", "member", "coach", "manager"];
    if (role && !allowedRoles.includes(role)) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const team = await Team.findOne({ teamSlug: slug }).session(session);
    if (!team) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const ownerId = String(team.user || team.userId || "");

    const tm = await TeamMember.findById(memberId).session(session);
    if (!tm || tm.deletedAt) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    /* ----------------------------------------------------------
       Permission rules
    ---------------------------------------------------------- */
    const isOwner = ownerId === String(actor._id);

    const actorLink = await TeamMember.findOne({
      teamId: team._id,
      userId: actor._id,
      deletedAt: null,
    })
      .select("role")
      .lean();

    const actorRole = isOwner ? "owner" : (actorLink?.role || "").toLowerCase();

    // Cannot modify owner row
    const isOwnerRow = !tm.familyMemberId && String(tm.userId) === ownerId;

    if (isOwnerRow) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Cannot modify team owner" },
        { status: 400 }
      );
    }

    const targetRole = (tm.role || "").toLowerCase();

    const canRemove =
      actorRole === "owner" ||
      (actorRole === "manager" && ["member", "coach"].includes(targetRole)) ||
      (actorRole === "coach" && targetRole === "member");

    const canChangeRole =
      actorRole === "owner" ||
      (actorRole === "manager" && targetRole !== "manager");

    /* ----------------------------------------------------------
   REMOVE MEMBER (soft delete + cleanup)
---------------------------------------------------------- */
    if (!role) {
      if (!canRemove) {
        await session.abortTransaction();
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const athleteType = tm.familyMemberId ? "family" : "user";
      const athleteId = tm.familyMemberId || tm.userId;

      // 1️⃣ Soft-delete TeamMember
      tm.deletedAt = new Date();
      tm.deletedByUserId = actor._id;
      await tm.save({ session });

      // 2️⃣ Soft-delete coach EVENT ENTRIES for this athlete
      await CoachEntry.updateMany(
        {
          team: team._id,
          deletedAt: null,
          $or: [
            { "athlete.user": athleteId },
            { "athlete.familyMember": athleteId },
          ],
        },
        {
          $set: {
            deletedAt: new Date(),
            deletedByUserId: actor._id,
          },
        },
        { session }
      );

      // 3️⃣ Find scouting reports involving this athlete
      const reports = await TeamScoutingReport.find(
        {
          teamId: team._id,
          reportFor: {
            $elemMatch: {
              athleteId,
              athleteType,
            },
          },
        },
        { _id: 1 }
      ).session(session);

      const reportIds = reports.map((r) => r._id);

      // 4️⃣ Soft-delete coach notes tied to those reports
      if (reportIds.length > 0) {
        await CoachMatchNote.updateMany(
          {
            team: team._id,
            entry: { $in: reportIds },
            deletedAt: null,
          },
          {
            $set: { deletedAt: new Date() },
          },
          { session }
        );
      }

      // 5️⃣ Reconcile scouting reports (remove athlete or delete report)
      await reconcileScoutingReportsForRemovedAthlete({
        session,
        teamId: team._id,
        athleteId,
        athleteType,
        removedByUserId: actor._id,
      });

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ success: true }, { status: 200 });
    }

    /* ----------------------------------------------------------
       ROLE CHANGE ONLY
    ---------------------------------------------------------- */
    if (!canChangeRole) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    tm.role = role;
    await tm.save({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      { success: true, member: { id: tm._id, role: tm.role } },
      { status: 200 }
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("PATCH /api/teams/[slug]/members/[memberId] error:", err);

    return NextResponse.json(
      { error: "Server error", detail: err?.message },
      { status: 500 }
    );
  }
}
