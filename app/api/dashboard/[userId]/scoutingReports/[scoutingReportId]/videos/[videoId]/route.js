import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Types } from "mongoose";
import Video from "@/models/videoModel";
import ScoutingReport from "@/models/scoutingReportModel";
import { getCurrentUserFromCookies } from "@/lib/auth";

export async function PATCH(request, context) {
  await connectDB();
  const { scoutingReportId, videoId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (
    !Types.ObjectId.isValid(scoutingReportId) ||
    !Types.ObjectId.isValid(videoId)
  ) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const allowedFields = {
      title: updates.title,
      notes: updates.notes,
      url: updates.url,
    };

    const updated = await Video.findOneAndUpdate(
      {
        _id: videoId,
        report: scoutingReportId,
        createdBy: currentUser._id, // Ensure ownership
      },
      allowedFields,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Video not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Video updated", video: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { message: "Failed to update video", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  await connectDB();

  const { scoutingReportId, videoId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Validate IDs
  if (
    !Types.ObjectId.isValid(scoutingReportId) ||
    !Types.ObjectId.isValid(videoId)
  ) {
    return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    console.log("Attempting to delete video:", {
      scoutingReportId,
      videoId,
      userId: currentUser._id,
    });

    const video = await Video.findById(videoId);

    if (!video) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    // Optionally, log the video for debugging
    // console.log("Video fetched:", video);

    await Video.deleteOne({ _id: videoId });

    await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
      $pull: { videos: videoId },
    });

    return NextResponse.json({ message: "Video deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { message: "Failed to delete video", error: error.message },
      { status: 500 }
    );
  }
}
