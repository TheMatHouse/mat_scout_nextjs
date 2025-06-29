// app/api/dashboard/[userId]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import User from "@/models/userModel";
import Technique from "@/models/techniquesModel";

export async function POST(req, context) {
  let body;

  try {
    const { userId } = await context.params;
    body = await req.json();
    await connectDB();

    // Step 1: Create the report without videos
    const report = new ScoutingReport({
      ...body,
      videos: [], // placeholder for now
      createdById: userId,
    });

    await report.save();

    // Step 2: Link the report to the user
    await User.findByIdAndUpdate(userId, {
      $push: { scoutingReports: report._id },
    });

    // Step 3: Save new techniques if they don't already exist
    if (body.athleteAttacks?.length) {
      for (const name of body.athleteAttacks) {
        const exists = await Technique.findOne({ techniqueName: name });
        if (!exists) {
          await Technique.create({ techniqueName: name });
        }
      }
    }

    // Step 4: Save videos if provided and associate them
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
      message: "Scouting report created successfully.",
    });
  } catch (err) {
    console.error("Body (if parsed):", JSON.stringify(body, null, 2));
    console.error("POST scoutingReports error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// GET: Get all scouting reports for self
export async function GET(request, context) {
  try {
    const { userId } = await await context.params;
    await connectDB();

    const scoutingReports = await ScoutingReport.find({ createdById: userId })
      .populate("videos") // if you store ObjectIds in the 'videos' field
      .sort({ createdAt: -1 });

    return new NextResponse(JSON.stringify(scoutingReports), { status: 200 });
  } catch (err) {
    console.error("GET scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
