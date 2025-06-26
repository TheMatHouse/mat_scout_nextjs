// app/api/dashboard/[userId]/family/[memberId]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import Technique from "@/models/techniquesModel";
import User from "@/models/userModel";

export async function POST(req, context) {
  let body;

  try {
    const { userId, memberId } = context.params;
    body = await req.json();
    await connectDB();

    // Step 1: Create the report with memberId as the athlete
    const report = new ScoutingReport({
      ...body,
      videos: [], // placeholder
      createdById: userId,
      athleteId: memberId,
    });

    await report.save();

    // Optional: store this report under user's scoutingReports array
    await User.findByIdAndUpdate(userId, {
      $push: { scoutingReports: report._id },
    });

    // Step 2: Save techniques if they don't already exist
    if (body.athleteAttacks?.length) {
      for (const name of body.athleteAttacks) {
        const exists = await Technique.findOne({ techniqueName: name });
        if (!exists) {
          await Technique.create({ techniqueName: name });
        }
      }
    }

    // Step 3: Save videos (support both videos and newVideos keys)
    const incomingVideos = body.videos || body.newVideos || [];
    const videoIds = [];

    if (incomingVideos.length) {
      for (const vid of incomingVideos) {
        const newVideo = await Video.create({
          ...vid,
          report: report._id,
          createdBy: userId,
        });
        videoIds.push(newVideo._id);
      }

      report.videos = videoIds;
      await report.save();
    }

    return NextResponse.json({
      message: "Family scouting report created successfully.",
    });
  } catch (err) {
    console.error("Body (if parsed):", JSON.stringify(body, null, 2));
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
    console.log("member Id ", memberId);
    if (!memberId) {
      return Response.json({ error: "Missing memberId" }, { status: 400 });
    }

    const reports = await ScoutingReport.find({
      athleteId: memberId,
      athleteType: "family",
    })
      .populate("videos")
      .sort({ createdAt: -1 });

    return Response.json(reports);
  } catch (err) {
    console.error("Error in GET /scoutingReports:", err);
    return Response.json({ error: "Failed to load reports" }, { status: 500 });
  }
}
