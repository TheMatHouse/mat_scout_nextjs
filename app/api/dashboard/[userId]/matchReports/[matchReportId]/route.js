export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import matchReport from "@/models/matchReportModel";
import "@/models/divisionModel";
import "@/models/weightCategoryModel";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

/* helpers */
const sid = (v) => (v == null ? "" : String(v).trim());
const safeJson = async (req) => {
  try {
    return await req.json();
  } catch {
    return {};
  }
};
const ownerFilter = (userId) => ({
  $or: [
    { createdById: { $in: [userId, String(userId)] } },
    { athleteId: { $in: [userId, String(userId)] } },
  ],
});
function buildUpdate(body) {
  return {
    matchType: body.matchType,
    eventName: body.eventName,
    matchDate: body.matchDate,

    myRank: body.myRank || "",
    opponentRank: body.opponentRank || "",

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

    result: body.result || "",
    score: body.score || "",

    video: {
      videoTitle: body.video?.videoTitle || body.videoTitle || "",
      videoURL: body.video?.videoURL || body.videoURL || "",
    },

    isPublic: !!body.isPublic,

    division: body.division || null,
    weightCategory: body.weightCategory || null,
    weightItemId: body.weightItemId || null,
    weightLabel: body.weightLabel || "",
    weightUnit: body.weightUnit || "",
  };
}

/* GET /api/dashboard/:userId/matchReports/:matchReportId  (single) */
export async function GET(_req, ctx) {
  try {
    const p = await ctx.params;
    const userId = sid(p?.userId);
    const reportId = sid(p?.matchReportId);

    if (!userId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const doc = await matchReport
      .findOne({ _id: reportId, ...ownerFilter(userId) })
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
      "GET /api/dashboard/[userId]/matchReports/[matchReportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to load report" },
      { status: 500 }
    );
  }
}

/* PATCH /api/dashboard/:userId/matchReports/:matchReportId */
export async function PATCH(req, ctx) {
  try {
    const p = await ctx.params;
    const body = await safeJson(req);

    const userId = sid(p?.userId) || sid(body?.userId);
    const reportId = sid(p?.matchReportId) || sid(body?.reportId);

    if (!userId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const update = buildUpdate(body);

    const doc = await matchReport.findOneAndUpdate(
      { _id: reportId, ...ownerFilter(userId) },
      update,
      { new: true }
    );

    if (!doc) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    // Save any newly-added techniques (pending)
    try {
      await saveUnknownTechniques([
        ...(Array.isArray(body.opponentAttacks) ? body.opponentAttacks : []),
        ...(Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []),
      ]);
    } catch (e) {
      console.warn("[saveUnknownTechniques] match report PATCH failed:", e);
    }

    return NextResponse.json(
      { ok: true, message: "Match report updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "PATCH /api/dashboard/[userId]/matchReports/[matchReportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to update match report" },
      { status: 500 }
    );
  }
}

/* DELETE /api/dashboard/:userId/matchReports/:matchReportId */
export async function DELETE(_req, ctx) {
  try {
    const p = await ctx.params;
    const userId = sid(p?.userId);
    const reportId = sid(p?.matchReportId);

    if (!userId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId or reportId" },
        { status: 400 }
      );
    }

    await connectDB();

    const res = await matchReport.deleteOne({
      _id: reportId,
      ...ownerFilter(userId),
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
      "DELETE /api/dashboard/[userId]/matchReports/[matchReportId] error:",
      err
    );
    return NextResponse.json(
      { message: "Failed to delete match report" },
      { status: 500 }
    );
  }
}
