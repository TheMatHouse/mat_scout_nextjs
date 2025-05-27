"use server";
import { sendResponse } from "@/lib/helpers/responseHelper";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import Technique from "@/models/techniquesModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "@/lib/mongo";

// Update a match report
export const PATCH = async (request, context) => {
  try {
    // connect to DB
    await connectDB();

    const { userId, matchReportId } = context.params || {};

    if (!userId || !matchReportId) {
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
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return sendResponse("Invalid or missing user or match report ID", 400);
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

    // Extract fields
    const {
      matchType,
      eventName,
      matchDate,
      opponentName,
      division,
      weightCategory,
      opponentClub,
      opponentCountry,
      opponentRank,
      opponentGrip,
      opponentAttacks,
      opponentAttackNotes,
      athleteAttacks,
      athleteAttackNotes,
      result,
      score,
      videoTitle,
      videoURL,
      isPublic,
    } = sanitizedBody;

    if (!sanitizedBody) {
      return sendResponse("Invalid JSON data", 400);
    }

    // Find user and match report in parallel
    const [user, matchReport] = await Promise.all([
      User.findOne({ clerkId: clerkUserId }),
      MatchReport.findOne({ _id: matchReportId, athlete: userId }),
    ]);

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

    if (!matchReport) {
      return sendResponse("Match Report not found", 404);
    }

    // Ensure all athlete & opponent attacks exist in the `Technique` collection
    const processAttacks = async (attacks) => {
      if (Array.isArray(attacks) && attacks.length > 0) {
        const existingTechniques = await Technique.find({
          techniqueName: { $in: attacks },
        }).distinct("techniqueName");
        const newTechniques = attacks.filter(
          (attack) => !existingTechniques.includes(attack)
        );
        if (newTechniques.length > 0) {
          await Technique.insertMany(
            newTechniques.map((name) => ({ techniqueName: name }))
          );
        }
      }
    };

    await Promise.all([
      processAttacks(athleteAttacks),
      processAttacks(opponentAttacks),
    ]);

    // Update the match report
    await MatchReport.updateOne(
      { _id: matchReportId },
      {
        $set: {
          matchType,
          eventName,
          matchDate,
          opponentName,
          division,
          weightCategory,
          opponentClub,
          opponentCountry,
          opponentRank,
          opponentGrip,
          opponentAttacks,
          opponentAttackNotes,
          athleteAttacks,
          athleteAttackNotes,
          result,
          score,
          videoTitle,
          videoURL,
          isPublic,
        },
      }
    );

    return sendResponse("Match report updated successfully", 200);
  } catch (error) {
    return sendResponse(`Error updating match report: ${error.message}`, 500);
  }
};

export const DELETE = async (request, context) => {
  try {
    await connectDB();

    const { userId, matchReportId } = context.params || {};

    if (!userId || !matchReportId) {
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
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return sendResponse("Invalid user or match report ID", 400);
    }

    // Check if user exists
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

    // Check if the match report exists and belongs to the user
    const match = await MatchReport.findOneAndDelete({
      _id: matchReportId,
      athlete: userId,
    });

    if (!match) {
      return sendResponse(
        "Match report not found or does not belong to user.",
        404
      );
    }

    return sendResponse("Match report deleted successfully", 200);
  } catch (error) {
    return sendResponse("Error deleting match report: " + error.message, 500);
  }
};
