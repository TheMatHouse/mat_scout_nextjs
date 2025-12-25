export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

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
   PATCH — update role OR remove member (declined)
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

    const allowedRoles = ["pending", "member", "coach", "manager", "declined"];
    if (!allowedRoles.includes(role)) {
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
    if (!tm) {
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
    })
      .select("role")
      .lean()
      .session(session); // ✅ THIS WAS MISSING

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

    if (role === "declined" && !canRemove) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role !== "declined" && !canChangeRole) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ----------------------------------------------------------
       REMOVE MEMBER (soft delete + scouting report cleanup)
    ---------------------------------------------------------- */
    if (role === "declined") {
      const athleteType = tm.familyMemberId ? "family" : "user";
      const athleteId = tm.familyMemberId || tm.userId;

      // Soft-delete TeamMember
      tm.role = "declined";
      await tm.save({ session });

      // Reconcile scouting reports
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
