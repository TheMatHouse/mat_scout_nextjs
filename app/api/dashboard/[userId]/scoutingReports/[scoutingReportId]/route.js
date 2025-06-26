import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Types } from "mongoose";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import { getCurrentUserFromCookies } from "@/lib/auth";

export async function PATCH(request, context) {
  await connectDB();
  const { userId, scoutingReportId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();
  console.log("scoutingReportID: ", scoutingReportId);
  if (!Types.ObjectId.isValid(scoutingReportId)) {
    return NextResponse.json({ message: "Invalid report ID" }, { status: 400 });
  }

  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // ✅ 1. Update existing videos
    if (Array.isArray(body.updatedVideos)) {
      for (const video of body.updatedVideos) {
        if (video._id && Types.ObjectId.isValid(video._id)) {
          await Video.findByIdAndUpdate(video._id, {
            $set: {
              title: video.title,
              notes: video.notes,
              url: video.url,
            },
          });
        }
      }
    }

    // ✅ 2. Delete removed videos
    if (Array.isArray(body.deletedVideos)) {
      await Video.deleteMany({ _id: { $in: body.deletedVideos } });

      await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
        $pull: { videos: { $in: body.deletedVideos } },
      });
    }

    // ✅ 2. Add new videos
    if (Array.isArray(body.newVideos) && body.newVideos.length > 0) {
      const newVideoIds = []; // ✅ DECLARE THIS

      try {
        for (const newVid of body.newVideos) {
          const createdVideo = await Video.create({
            ...newVid,
            scoutingReport: scoutingReportId,
            createdBy: userId,
          });

          newVideoIds.push(createdVideo._id);
        }

        if (newVideoIds.length) {
          await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
            $push: { videos: { $each: newVideoIds } },
          });
        }
      } catch (err) {
        console.error("❌ Error adding new video:", err);
        return NextResponse.json(
          { message: "Failed to add new video" },
          { status: 500 }
        );
      }
    }

    // ✅ 4. Update the report’s other fields
    const fieldsToUpdate = { ...body };
    delete fieldsToUpdate.updatedVideos;
    delete fieldsToUpdate.deletedVideos;
    delete fieldsToUpdate.videos;

    const updatedReport = await ScoutingReport.findOneAndUpdate(
      { _id: scoutingReportId, createdById: userId },
      { $set: fieldsToUpdate },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Report updated", report: updatedReport },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { message: "Failed to update report", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  await connectDB();

  const { userId, scoutingReportId } = await context.params; // ✅ YES, await

  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(scoutingReportId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUserFromCookies(request);
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdById: userId,
    });

    if (!report) {
      console.warn("🚫 Scouting report not found for deletion");
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    const videoIds = Array.isArray(report.videos) ? report.videos : [];

    if (videoIds.length > 0) {
      const deleted = await Video.deleteMany({ _id: { $in: videoIds } });
      console.log(`✅ Deleted ${deleted.deletedCount} associated videos`);
    }

    await report.deleteOne();

    return NextResponse.json(
      { message: "Scouting report and associated videos deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error deleting scouting report:", error);
    return NextResponse.json(
      { message: "Failed to delete scouting report" },
      { status: 500 }
    );
  }
}
