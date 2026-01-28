// app/api/dashboard/[userId]/scoutingReports/shared/[scoutingReportId]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import PrivateShare from "@/models/privateShareModel";

// ensure refs resolve
import "@/models/divisionModel";
import "@/models/weightCategoryModel";

/* helpers */
const sid = (v) => (v == null ? "" : String(v).trim());

// scouting reports are owned by creator only
const ownerFilter = (userId) => ({
  createdBy: { $in: [userId, String(userId)] },
});

async function hasShareAccess({ ownerId, viewerId, documentId }) {
  if (!viewerId) return false;

  // ALL scouting reports
  const all = await PrivateShare.findOne({
    ownerId,
    documentType: "personal-scout",
    sharedWithUserId: viewerId,
    scope: "all",
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  if (all) return true;

  // ONE scouting report
  const one = await PrivateShare.findOne({
    documentType: "personal-scout",
    documentId,
    sharedWithUserId: viewerId,
    scope: "one",
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  return !!one;
}

/* GET /api/dashboard/:userId/scoutingReports/shared/:scoutingReportId */
export async function GET(_req, ctx) {
  try {
    const p = await ctx.params;
    const userId = sid(p?.userId);
    const reportId = sid(p?.scoutingReportId);

    if (!userId || !reportId) {
      return NextResponse.json(
        { message: "Missing userId or reportId" },
        { status: 400 },
      );
    }

    await connectDB();

    // Load report without owner filter first
    const report = await ScoutingReport.findById(reportId)
      .populate({ path: "division", select: "name gender" })
      .populate({
        path: "weightCategory",
        select: "unit items._id items.label",
      });

    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 },
      );
    }

    // Owner always allowed
    const isOwner = String(report.createdBy) === String(userId);

    if (!isOwner) {
      const allowed = await hasShareAccess({
        ownerId: report.createdBy,
        viewerId: userId,
        documentId: report._id,
      });

      if (!allowed) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ ok: true, report }, { status: 200 });
  } catch (err) {
    console.error(
      "GET /api/dashboard/[userId]/scoutingReports/shared/[scoutingReportId] error:",
      err,
    );
    return NextResponse.json(
      { message: "Failed to load shared scouting report" },
      { status: 500 },
    );
  }
}
