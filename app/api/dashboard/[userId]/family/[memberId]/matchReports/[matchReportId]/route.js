// app/api/dashboard/[userId]/family/[memberId]/matchReports/[reportId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import matchReport from "@/models/matchReportModel";

/* ---------------- helpers ---------------- */
const sid = (v) => (v == null ? "" : String(v).trim());

const safeJson = async (req) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};

function buildUpdate(body) {
  return {
    matchType: body.matchType,
    eventName: body.eventName,
    matchDate: body.matchDate,

    // ranks stored as labels
    myRank: body.myRank || "",
    opponentRank: body.opponentRank || "",

    // opponent
    opponentName: body.opponentName || "",
    opponentClub: body.opponentClub || "",
    opponentCountry: body.opponentCountry ?? "",
    opponentGrip: body.opponentGrip || "",

    opponentAttacks: Array.isArray(body.opponentAttacks)
      ? body.opponentAttacks
      : [],
    opponentAttackNotes: body.opponentAttackNotes || "",

    athleteAttacks: Array.isArray(body.athleteAttacks)
      ? body.athleteAttacks
      : [],
    athleteAttackNotes: body.athleteAttackNotes || "",

    // result
    result: body.result || "",
    score: body.score || "",

    // video
    video: {
      videoTitle: body.video?.videoTitle || body.videoTitle || "",
      videoURL: body.video?.videoURL || body.videoURL || "",
    },

    isPublic: !!body.isPublic,

    // division / weights (ids + snapshot)
    division: body.division || null,
    weightCategory: body.weightCategory || null,
    weightItemId: body.weightItemId || null,
    weightLabel: body.weightLabel || "",
    weightUnit: body.weightUnit || "",
  };
}

/* ---------------- GET (single family report) ---------------- */
// GET /api/dashboard/:userId/family/:memberId/matchReports/:reportId
export async function GET(_req, { params }) {
  try {
    const userId = sid(params?.userId);
    const memberId = sid(params?.memberId);
    const reportId = sid(params?.reportId);

    if (!userId || !memberId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId, memberId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await matchReport
      .findOne({
        _id: reportId,
        createdById: userId,
        athleteId: memberId,
      })
      .populate({ path: "division", select: "name gender" })
      .populate({
        path: "weightCategory",
        select: "unit items._id items.label",
      });

    if (!doc) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, report: doc }, { status: 200 });
  } catch (err) {
    console.error(
      "GET /api/dashboard/[userId]/family/[memberId]/matchReports/[reportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to load report" },
      { status: 500 }
    );
  }
}

/* ---------------- PATCH (update family report) ---------------- */
// PATCH /api/dashboard/:userId/family/:memberId/matchReports/:reportId
export async function PATCH(req, { params }) {
  try {
    const body = await safeJson(req);

    const userId = sid(params?.userId || body?.userId);
    const memberId = sid(
      params?.memberId || body?.familyMemberId || body?.athleteId
    );
    const reportId = sid(params?.reportId || body?.reportId);

    if (!userId || !memberId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId, memberId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const update = buildUpdate(body);

    // Require ownership: parent created it AND it belongs to this family member
    const doc = await matchReport.findOneAndUpdate(
      { _id: reportId, createdById: userId, athleteId: memberId },
      update,
      { new: true }
    );

    if (!doc) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Match report updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "PATCH /api/dashboard/[userId]/family/[memberId]/matchReports/[reportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to update match report" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE (remove family report) ---------------- */
// DELETE /api/dashboard/:userId/family/:memberId/matchReports/:reportId
export async function DELETE(_req, { params }) {
  try {
    const userId = sid(params?.userId);
    const memberId = sid(params?.memberId);
    const reportId = sid(params?.reportId);

    if (!userId || !memberId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId, memberId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const res = await matchReport.deleteOne({
      _id: reportId,
      createdById: userId,
      athleteId: memberId,
    });

    if (res.deletedCount === 0) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Match report deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "DELETE /api/dashboard/[userId]/family/[memberId]/matchReports/[reportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to delete match report" },
      { status: 500 }
    );
  }
}
