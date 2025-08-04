import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import Video from "@/models/videoModel";
import ScoutingReport from "@/models/scoutingReportModel";

export async function DELETE(req, context) {
  try {
    await connectDB();

    const { slug, reportId, videoId } = await context.params;
    const currentUser = await getCurrentUserFromCookies();

    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    if (!video.report || video.report.toString() !== reportId) {
      return NextResponse.json(
        { message: "Video not associated with this report" },
        { status: 403 }
      );
    }

    // ✅ Delete the video document itself
    await video.deleteOne();

    // ✅ Remove the reference from the report's videos array
    await ScoutingReport.findByIdAndUpdate(reportId, {
      $pull: { videos: video._id },
    });

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE team scouting report video error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
