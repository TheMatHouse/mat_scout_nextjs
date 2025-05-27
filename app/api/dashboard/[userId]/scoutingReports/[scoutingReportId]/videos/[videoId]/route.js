"use server";
import { NextResponse } from "next/server";
import Video from "@/models/videoModel";
import ScoutingReport from "@/models/scoutingReportModal";
import User from "@/models/userModel";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";

export const DELETE = async (request, context) => {
  try {
    await connectDB();

    // Await context.params before using its properties

    const { userId, scoutingReportId, videoId } = context.params || {};

    if (!userId || !scoutingReportId || !videoId) {
      return NextResponse.json(
        {
          message:
            "Missing required parameters: userId, scoutingReportId, or videoId",
        },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = getAuth(request);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return NextResponse.json(
        { message: "Unauthorized. Please sign in to perform this action." },
        { status: 401 }
      );
    }

    // Validate ObjectId before sanitization
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId) ||
      !Types.ObjectId.isValid(videoId)
    ) {
      return NextResponse.json(
        { message: "Invalid userId, scoutingReportId, or videoId format." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findOne({ clerkId: clerkUserId });
    if (!user) {
      return NextResponse.json(
        {
          message: "User not found. Please ensure your account is registered.",
        },
        { status: 404 }
      );
    }

    // Ensure the authenticated user is deleting their own report
    if (user._id.toString() !== userId) {
      return NextResponse.json(
        {
          message:
            "Permission denied. You can only delete your own scouting reports.",
        },
        { status: 403 }
      );
    }

    // Check if the scouting report exists and belongs to the user
    const report = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdBy: userId,
    });
    if (!report) {
      return NextResponse.json(
        {
          message: "Scouting report not found or does not belong to this user.",
        },
        { status: 404 }
      );
    }

    // Check if the video exists and belongs to the scouting report
    const video = await Video.findOne({
      _id: videoId,
      report: scoutingReportId,
    });

    if (!video) {
      return NextResponse.json(
        {
          message: "Video not found or does not belong to the scouting report.",
        },
        { status: 404 }
      );
    }

    await Video.deleteOne({ _id: videoId });

    return NextResponse.json(
      { message: "Video deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { message: `Server error while deleting video: ${error.message}` },
      { status: 500 }
    );
  }
};
