"use server";
import { NextResponse } from "next/server";
import Video from "@/models/videoModel";
import ScoutingReport from "@/models/scoutingReportModal";
import User from "@/models/userModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "@/config/mongo";

export const DELETE = async (request, { params }) => {
  try {
    await connectDB();

    // Destructure params (keep original immutable)
    const { userId, scoutingReportId, videoId } = params;

    // Validate ObjectId before sanitization
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId) ||
      !Types.ObjectId.isValid(videoId)
    ) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing user, scouting report, or video ID",
        }),
        { status: 400 }
      );
    }

    // Sanitize params (use new variables to keep originals unchanged)
    const sanitizedUserId = mongoSanitize.sanitize(userId);
    const sanitizedScoutingReportId = mongoSanitize.sanitize(scoutingReportId);
    const sanitizedVideoId = mongoSanitize.sanitize(videoId);

    // Check if user exists
    const user = await User.findById(sanitizedUserId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Check if the scouting report exists and belongs to the user
    const report = await ScoutingReport.findOne({
      _id: sanitizedScoutingReportId,
      createdBy: sanitizedUserId,
    });
    if (!report) {
      return new NextResponse(
        JSON.stringify({
          message: "Scouting report not found or does not belong to user.",
        }),
        { status: 404 }
      );
    }

    // Check if the video exists and belongs to the scouting report
    const video = await Video.findOneAndDelete({
      _id: sanitizedVideoId,
      report: sanitizedScoutingReportId,
    });
    if (!video) {
      return new NextResponse(
        JSON.stringify({
          message: "Video not found or does not belong to scouting report.",
        }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: "Video deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return new NextResponse(
      JSON.stringify({ message: `Error deleting video: ${error.message}` }),
      { status: 500 }
    );
  }
};
