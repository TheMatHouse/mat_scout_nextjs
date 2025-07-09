import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import Team from "@/models/teamModel";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";

export async function PATCH(req, context) {
  try {
    await connectDB();
    const { slug, reportId } = await context.params;

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const report = await ScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    });
    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    const { videoId, title, notes, videoURL } = await req.json();

    if (!videoId) {
      return NextResponse.json({ message: "Missing videoId" }, { status: 400 });
    }

    const video = await Video.findById(videoId);
    if (!video || video.reportId.toString() !== reportId) {
      return NextResponse.json(
        { message: "Video not found or mismatched report" },
        { status: 404 }
      );
    }

    video.title = title || video.title;
    video.notes = notes || video.notes;
    video.videoURL = videoURL || video.videoURL;
    await video.save();

    return NextResponse.json(
      { message: "Video updated", video },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH video error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
