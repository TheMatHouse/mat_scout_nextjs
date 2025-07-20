// app/api/teams/[slug]/scoutingReports/[reportId]/route.js
import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
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

    const body = await req.json();
    console.log("PATCH request body:", body);

    const report = await ScoutingReport.findById(reportId);
    if (!report) {
      return NextResponse.json(
        { message: "Scouting report not found" },
        { status: 404 }
      );
    }

    // Update standard fields
    const allowedFields = [
      "title",
      "notes",
      "matchType",
      "athleteFirstName",
      "athleteLastName",
      "athleteNationalRank",
      "athleteWorldRank",
      "division",
      "weightCategory",
      "athleteClub",
      "athleteCountry",
      "athleteGrip",
      "athleteAttacks",
      "athleteAttackNotes",
      "reportFor",
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        report[field] = body[field];
      }
    });

    // ✅ Save any new techniques that don't exist yet
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // Handle new videos
    if (body.newVideos && Array.isArray(body.newVideos)) {
      for (const vid of body.newVideos) {
        const newVid = await Video.create({
          title: vid.title,
          notes: vid.notes,
          url: vid.url,
          report: report._id,
          createdBy: currentUser._id,
        });
        report.videos.push(newVid._id);
      }
    }

    // Handle updated videos
    if (body.updatedVideos && Array.isArray(body.updatedVideos)) {
      for (const vid of body.updatedVideos) {
        await Video.findByIdAndUpdate(vid._id, {
          title: vid.title,
          notes: vid.notes,
          url: vid.url,
        });
      }
    }

    // Handle deleted videos
    if (body.deletedVideos && Array.isArray(body.deletedVideos)) {
      for (const videoId of body.deletedVideos) {
        await Video.findByIdAndDelete(videoId);
        report.videos = report.videos.filter((id) => id.toString() !== videoId);
      }
    }

    await report.save();
    return NextResponse.json(
      { message: "Report updated", report },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  await connectDB();
  const { slug, reportId } = await context.params;

  console.log("DELETE request received");
  console.log("Slug:", slug);
  console.log("Report ID:", reportId);

  const currentUser = await getCurrentUserFromCookies();
  console.log("Current User:", currentUser);

  if (!Types.ObjectId.isValid(reportId)) {
    console.warn("Invalid report ID");
    return new NextResponse(JSON.stringify({ message: "Invalid report ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!currentUser || !currentUser._id) {
    console.warn("Unauthorized - no user");
    return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const team = await Team.findOne({ teamSlug: slug });
    console.log("Matched Team:", team);

    if (!team) {
      return new NextResponse(JSON.stringify({ message: "Team not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const report = await ScoutingReport.findOne({
      _id: reportId,
      teamId: team._id,
    });

    console.log("Matched Report:", report);

    if (!report) {
      return new NextResponse(
        JSON.stringify({ message: "Scouting report not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Delete associated videos if any
    if (report.videos && report.videos.length > 0) {
      await Video.deleteMany({ _id: { $in: report.videos } });
      console.log("Associated videos deleted");
    }

    // Delete the report
    await ScoutingReport.findByIdAndDelete(reportId);
    console.log("Scouting report deleted");

    return new NextResponse(
      JSON.stringify({
        message: "Scouting report and associated videos deleted",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("DELETE team scouting report error:", err);
    return new NextResponse(
      JSON.stringify({ message: "Server error: " + err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
