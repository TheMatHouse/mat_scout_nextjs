// app/api/dashboard/[userId]/family/[memberId]/scoutingReports/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import Technique from "@/models/techniquesModel"; // (kept if you need elsewhere)
import User from "@/models/userModel";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

export async function POST(req, context) {
  let body;
  try {
    const { userId, memberId } = await context.params;
    body = await req.json();
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 1) Create the report first
    const report = await ScoutingReport.create({
      ...body,
      createdById: userId,
      createdByName: `${user.firstName} ${user.lastName}`.trim(),
      reportFor: [{ athleteId: memberId, athleteType: "family" }],
      athleteId: memberId,
      athleteType: "family",
      videos: [], // will fill below
    });

    // 2) Link report to user (optional)
    await User.findByIdAndUpdate(userId, {
      $push: { scoutingReports: report._id },
    });

    // 3) Save any unknown techniques
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // 4) Create videos and attach to report
    const incoming =
      (Array.isArray(body?.newVideos) && body.newVideos) ||
      (Array.isArray(body?.videos) && body.videos) ||
      [];

    const toCreate = incoming
      .map((v) => ({
        title: (v.title ?? v.videoTitle ?? "").trim(),
        notes: (v.notes ?? v.videoNotes ?? "").trim(),
        url: (v.url ?? v.videoURL ?? "").trim(),
      }))
      .filter((v) => v.url); // require URL

    let videoIds = [];
    if (toCreate.length) {
      const created = await Video.insertMany(
        toCreate.map((v) => ({
          ...v,
          scoutingReport: report._id,
          createdBy: userId,
        }))
      );
      videoIds = created.map((d) => d._id);

      // One atomic update to attach all ids
      await ScoutingReport.updateOne(
        { _id: report._id },
        { $set: { videos: videoIds } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: String(report._id),
        message: "Family scouting report created successfully.",
        videosLinked: videoIds.length,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Body (if parsed):", JSON.stringify(body ?? {}, null, 2));
    console.error("POST family scoutingReports error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function GET(req, context) {
  try {
    await connectDB();

    const { memberId } = await context.params;
    if (!memberId) {
      return NextResponse.json(
        { message: "Missing memberId" },
        { status: 400 }
      );
    }

    const reports = await ScoutingReport.find({
      reportFor: {
        $elemMatch: {
          athleteId: memberId,
          athleteType: "family",
        },
      },
    })
      .populate("videos")
      .sort({ createdAt: -1 });

    return NextResponse.json(reports);
  } catch (err) {
    console.error("GET family scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to load reports" },
      { status: 500 }
    );
  }
}
