import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import Technique from "@/models/techniquesModel";
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

    // Step 1: Create the scouting report
    const report = new ScoutingReport({
      ...body,
      createdById: userId,
      createdByName: `${user.firstName} ${user.lastName}`,
      reportFor: [{ athleteId: memberId, athleteType: "family" }],
      athleteId: memberId,
      athleteType: "family",
      videos: [],
    });

    await report.save();

    // Optional: link report to user
    await User.findByIdAndUpdate(userId, {
      $push: { scoutingReports: report._id },
    });

    // ✅ Step 2: Store new techniques via utility
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // Step 3: Save videos (from body.newVideos or body.videos)
    const incomingVideos = body.newVideos || body.videos || [];
    const videoIds = [];

    for (const vid of incomingVideos) {
      const newVideo = await Video.create({
        ...vid,
        scoutingReport: report._id,
        createdBy: userId,
      });
      videoIds.push(newVideo._id);
    }

    if (videoIds.length) {
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
