"use server";
import { sendResponse } from "@/lib/helpers/responseHelper";
import ScoutingReport from "@/models/scoutingReportModal";
import User from "@/models/userModel";
import Video from "@/models/videoModel";
import Technique from "@/models/techniquesModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "@/config/mongo";

export const PATCH = async (request, context) => {
  try {
    await connectDB();

    const { userId, scoutingReportId } = context.params || {};

    if (!userId || !scoutingReportId) {
      return sendResponse("Missing required parameters", 400);
    }

    // Authenticate user
    const auth = getAuth(request);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return sendResponse(
        "Unauthorized. Please sign in to perform this action.",
        401
      );
    }

    // Validate IDs
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId)
    ) {
      return sendResponse("Invalid or missing user or scouting report ID", 400);
    }

    // Ensure request body exists
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return sendResponse("Invalid JSON format in request body", 400);
    }

    if (!requestBody || Object.keys(requestBody).length === 0) {
      return sendResponse("Empty request body", 400);
    }

    const sanitizedBody = mongoSanitize.sanitize(requestBody);

    const {
      team,
      matchType,
      division,
      weightCategory,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks,
      athleteAttackNotes,
      videos,
    } = sanitizedBody;

    // Check if user exists
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return sendResponse("User not found", 404);
    }

    // Check if scouting report exists and update it
    const scoutingReport = await ScoutingReport.findOneAndUpdate(
      { _id: scoutingReportId, createdBy: userId },
      {
        team,
        matchType,
        division,
        weightCategory,
        athleteFirstName,
        athleteLastName,
        athleteNationalRank,
        athleteWorldRank,
        athleteClub,
        athleteCountry,
        athleteRank,
        athleteGrip,
        athleteAttacks,
        athleteAttackNotes,
      },
      { new: true }
    );

    if (!scoutingReport) {
      return sendResponse("Scouting Report not found or unauthorized", 404);
    }

    // Process athlete attacks
    if (Array.isArray(athleteAttacks) && athleteAttacks.length > 0) {
      await Promise.all(
        athleteAttacks.map(async (attack) => {
          const exists = await Technique.exists({ techniqueName: attack });
          if (!exists) {
            try {
              await Technique.create({ techniqueName: attack });
            } catch (error) {
              console.error(`Failed to create technique: ${attack}`, error);
            }
          }
        })
      );
    }

    // Process and save videos
    if (Array.isArray(videos) && videos.length > 0) {
      for (const video of videos) {
        try {
          const existingVideo = await Video.findOne({
            videoURL: video.videoURL,
            report: scoutingReportId,
          });

          if (existingVideo) {
            existingVideo.videoTitle = video.videoTitle;
            existingVideo.videoNotes = video.videoNotes;
            await existingVideo.save();
          } else {
            await Video.create({
              videoTitle: video.videoTitle,
              videoURL: video.videoURL,
              videoNotes: video.videoNotes,
              report: scoutingReportId,
            });
          }
        } catch (error) {
          console.error(`Error handling video: ${video.videoURL}`, error);
        }
      }
    }

    return sendResponse("Scouting report updated successfully", 200);
  } catch (error) {
    console.error(`Error updating scouting report:`, error);
    return sendResponse(
      `Error updating scouting report: ${error.message}`,
      500
    );
  }
};

export const DELETE = async (request, context) => {
  try {
    await connectDB();

    const { userId, scoutingReportId } = context.params || {};

    if (!userId || !scoutingReportId) {
      return sendResponse("Missing required parameters", 400);
    }

    // Authenticate user
    const auth = getAuth(request);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return sendResponse(
        "Unauthorized. Please sign in to perform this action.",
        401
      );
    }

    // Validate MongoDB ObjectId format
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId)
    ) {
      return sendResponse("Invalid user or scouting report ID", 400);
    }

    // Find the user in the database
    const user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      return sendResponse("User not found", 404);
    }

    // Ensure the authenticated user is deleting their own report
    if (user._id.toString() !== userId) {
      return sendResponse(
        "You don't have permission to delete this scouting report",
        403
      );
    }

    // Delete all videos associated with the scouting report
    const deletedVideos = await Video.deleteMany({ report: scoutingReportId });

    // Delete the scouting report
    const deletedReport = await ScoutingReport.findOneAndDelete({
      _id: scoutingReportId,
      createdBy: userId,
    });

    if (!deletedReport) {
      return sendResponse(
        "Scouting report not found or does not belong to user",
        404
      );
    }

    return sendResponse(
      `Scouting report and ${deletedVideos.deletedCount} associated videos deleted successfully`,
      200
    );
  } catch (error) {
    console.error(
      `Error deleting scouting report (userId: ${userId}, scoutingReportId: ${scoutingReportId}):`,
      error
    );
    return sendResponse(
      `Error deleting scouting report: ${error.message}`,
      500
    );
  }
};
