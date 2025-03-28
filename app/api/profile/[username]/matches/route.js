"use server";
import { sendResponse } from "@/lib/helpers/responseHelper";
import User from "@/models/userModel";
import MatchReport from "@/models/matchReportModel";
import { connectDB } from "@/config/mongo";
import mongoSanitize from "express-mongo-sanitize";

export const GET = async (request, context) => {
  try {
    connectDB();

    const params = await context.params;
    let username = params?.username;

    if (!username) {
      return sendResponse("Username not found in request parameters", 400);
    }

    // Sanitize username
    username = mongoSanitize.sanitize(username).toLowerCase();

    // get user to have access to userId
    const user = await User.findOne({ username });

    // Ensure user is valid and not empty
    if (!user) {
      return sendResponse("User not found", 404);
    }

    // get match reports that are set to public
    const reports = await MatchReport.find({
      athlete: user._id,
      isPublic: true,
    });

    // Ensure reports is valid and not empty
    if (!reports) {
      return sendResponse("User not found", 404);
    }
    return sendResponse(reports, 200);
  } catch (error) {
    console.error(`Error updating scouting report:`, error);
    return sendResponse(`Error fetching match reports: ${error.message}`, 500);
  }
};
