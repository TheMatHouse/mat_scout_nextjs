// app/api/dashboard/[userId]/family/[memberId]/scoutingReports/[scoutingReportId]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import User from "@/models/userModel";
import { Types } from "mongoose";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

// PATCH: Update a family member's scouting report
export async function PATCH(req, context) {
  let body;

  try {
    const { userId, memberId, scoutingReportId } = await context.params;
    body = await req.json();
    await connectDB();

    const report = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdById: userId,
      athleteId: memberId,
      athleteType: "family",
    });

    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Extract and update fields
    const {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteRank,
      athleteGrip,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      athleteAttackNotes,
      accessList,
      updatedVideos = [],
      newVideos = [],
      deletedVideos = [],
    } = body;

    Object.assign(report, {
      athleteFirstName,
      athleteLastName,
      athleteCountry,
      athleteClub,
      athleteWorldRank,
      athleteNationalRank,
      athleteRank,
      athleteGrip,
      matchType,
      weightCategory,
      division,
      athleteAttacks,
      athleteAttackNotes,
      accessList,
    });

    // ✅ Use centralized saveUnknownTechniques
    await saveUnknownTechniques(
      Array.isArray(athleteAttacks) ? athleteAttacks : []
    );

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
        scoutingReport: report._id,
        createdBy: userId,
      });
      newVideoIds.push(newVid._id);
    }

    // Remove deleted videos
    if (deletedVideos?.length) {
      await Video.deleteMany({ _id: { $in: deletedVideos } });
      report.videos = report.videos.filter(
        (vidId) => !deletedVideos.includes(String(vidId))
      );
    }

    // Merge videos
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

// DELETE: Delete all scouting reports + videos for a family member by user
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
    const reports = await ScoutingReport.find({
      createdById: userId,
      athleteId: memberId,
      athleteType: "family",
    });

    const reportIds = reports.map((r) => r._id);

    const deletedVideos = await Video.deleteMany({
      scoutingReport: { $in: reportIds },
    });

    const deletedReports = await ScoutingReport.deleteMany({
      _id: { $in: reportIds },
    });

    return NextResponse.json({
      message: `Deleted ${deletedReports.deletedCount} report(s) and ${deletedVideos.deletedCount} video(s).`,
    });
  } catch (err) {
    console.error("DELETE family scoutingReports error:", err);
    return NextResponse.json(
      { message: "Server error while deleting reports and videos" },
      { status: 500 }
    );
  }
}
