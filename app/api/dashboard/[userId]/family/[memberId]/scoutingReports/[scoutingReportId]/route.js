import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import { Types } from "mongoose";
import { getCurrentUserFromCookies } from "@/lib/auth";

// PATCH: Update a family member's scouting report
export async function PATCH(req, context) {
  console.log("TESTING");
  let body;
  try {
    const { userId, memberId, scoutingReportId } = await context.params;
    body = await req.json();
    await connectDB();

    console.log("USERID ", userId);
    console.log("MEMBERID", memberId);
    console.log("SCOUTINGREPORT ID ", scoutingReportId);
    const report = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdById: userId,
      athleteId: memberId,
    });

    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Update basic report fields (excluding videos)
    const {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteStyle,
      athleteLevel,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      opponentStrengths,
      notes,
      updatedVideos = [],
      newVideos = [],
    } = body;

    Object.assign(report, {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteStyle,
      athleteLevel,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      opponentStrengths,
      notes,
    });

    // Save new techniques if needed
    if (athleteAttacks?.length) {
      for (const name of athleteAttacks) {
        const exists = await Technique.findOne({ techniqueName: name });
        if (!exists) {
          await Technique.create({ techniqueName: name });
        }
      }
    }

    // Update existing videos
    for (const video of updatedVideos) {
      await Video.findByIdAndUpdate(video._id, {
        $set: {
          title: video.title,
          notes: video.notes,
          url: video.url,
        },
      });
    }

    // Add new videos
    const newVideoIds = [];
    for (const video of newVideos) {
      const newVid = await Video.create({
        ...video,
        report: report._id,
        createdBy: userId,
      });
      newVideoIds.push(newVid._id);
    }

    // Merge existing + new video IDs into report
    report.videos = [...report.videos, ...newVideoIds];
    await report.save();

    return NextResponse.json({
      message: "Family scouting report updated successfully.",
    });
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a family member's scouting report
export async function DELETE(req, context) {
  await connectDB();

  const { userId, memberId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(memberId)) {
    return NextResponse.json({ message: "Invalid member ID" }, { status: 400 });
  }

  try {
    // Find all reports by user for this member
    const reports = await ScoutingReport.find({
      createdById: userId,
      athleteId: memberId,
    });

    const reportIds = reports.map((r) => r._id);

    // Delete all videos linked to these reports
    const deletedVideos = await Video.deleteMany({
      report: { $in: reportIds },
    });

    // Delete the reports themselves
    const deletedReports = await ScoutingReport.deleteMany({
      _id: { $in: reportIds },
    });

    return NextResponse.json({
      message: `Deleted ${deletedReports.deletedCount} report(s) and ${deletedVideos.deletedCount} video(s).`,
    });
  } catch (err) {
    console.error("Error deleting family scouting reports/videos:", err);
    return NextResponse.json(
      { message: "Server error while deleting reports and videos" },
      { status: 500 }
    );
  }
}
