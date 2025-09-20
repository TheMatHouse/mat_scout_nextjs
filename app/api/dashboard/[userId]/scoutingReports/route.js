// app/api/dashboard/[userId]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Division from "@/models/divisionModel";

export const dynamic = "force-dynamic";

// GET: list current user's scouting reports
export async function GET(_req, context) {
  const { userId } = (await context.params) ?? {};
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid userId" }, { status: 400 });
  }

  await connectDB();

  try {
    const reports = await ScoutingReport.find({ createdById: userId })
      .populate({ path: "division", model: Division, select: "name gender" })
      .lean();

    return NextResponse.json(reports ?? [], { status: 200 });
  } catch (err) {
    console.error("GET scoutingReports error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// POST: create a new scouting report
export async function POST(req, context) {
  const { userId } = (await context.params) ?? {};
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid userId" }, { status: 400 });
  }

  await connectDB();

  try {
    const body = await req.json();

    if (!body?.matchType) {
      return NextResponse.json(
        { message: "matchType (style) is required" },
        { status: 400 }
      );
    }

    const division =
      typeof body.division === "string" && Types.ObjectId.isValid(body.division)
        ? body.division
        : undefined;

    const weightCategory =
      body.weightCategory ?? body.weightItemId ?? undefined;
    const weightLabel = body.weightLabel ?? undefined;
    const weightUnit = body.weightUnit ?? undefined;

    const doc = new ScoutingReport({
      reportFor: Array.isArray(body.reportFor) ? body.reportFor : [],
      createdById: userId,
      createdByName: body.createdByName ?? "",
      matchType: body.matchType,

      division,
      weightCategory,
      weightItemId: weightCategory,
      weightLabel,
      weightUnit,

      athleteFirstName: body.athleteFirstName ?? "",
      athleteLastName: body.athleteLastName ?? "",
      athleteNationalRank: body.athleteNationalRank ?? "",
      athleteWorldRank: body.athleteWorldRank ?? "",
      athleteClub: body.athleteClub ?? "",
      athleteCountry: body.athleteCountry ?? "",
      athleteRank: body.athleteRank ?? "",
      athleteGrip: body.athleteGrip ?? "",
      athleteAttacks: Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [],
      athleteAttackNotes: body.athleteAttackNotes ?? "",
      accessList: Array.isArray(body.accessList) ? body.accessList : [],

      videos: [
        ...(Array.isArray(body.updatedVideos) ? body.updatedVideos : []),
        ...(Array.isArray(body.newVideos) ? body.newVideos : []),
      ],
    });

    await doc.save();

    return NextResponse.json(
      { message: "Scouting report created.", id: String(doc._id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to create scouting report", error: err.message },
      { status: 500 }
    );
  }
}
