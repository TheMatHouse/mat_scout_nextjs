"use server";
import { NextResponse } from "next/server";
import ScoutingReport from "@/models/scoutingReportModal";
import User from "@/models/userModel";
import Video from "@/models/videoModel";
import Technique from "@/models/techniquesModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "@/config/mongo";

export const PATCH = async (request, { params }) => {
  try {
    await connectDB();

    let { userId, scoutingReportId } = params;

    // Sanitize params
    userId = mongoSanitize.sanitize(userId);
    scoutingReportId = mongoSanitize.sanitize(scoutingReportId);

    // Validate IDs
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId)
    ) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing user or scouting report ID",
        }),
        { status: 400 }
      );
    }

    if (!request.body) {
      return new NextResponse(
        JSON.stringify({ message: "Empty request body" }),
        { status: 400 }
      );
    }

    const sanitizedBody = mongoSanitize.sanitize(await request.json());
    if (!sanitizedBody) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON data" }),
        { status: 400 }
      );
    }

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
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Check if scouting report exists and belongs to user
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
      return new NextResponse(
        JSON.stringify({
          message: "Scouting Report not found or unauthorized",
        }),
        { status: 404 }
      );
    }

    // Process athlete attacks (ensure they exist in Techniques collection)
    if (Array.isArray(athleteAttacks) && athleteAttacks.length > 0) {
      await Promise.all(
        athleteAttacks.map(async (attack) => {
          const exists = await Technique.exists({ techniqueName: attack });
          if (!exists) await Technique.create({ techniqueName: attack });
        })
      );
    }

    // Process and save videos if provided
    if (Array.isArray(videos) && videos.length > 0) {
      await Video.insertMany(
        videos.map((video) => ({
          videoTitle: video.videoTitle,
          videoURL: video.videoURL,
          videoNotes: video.videoNotes,
          report: scoutingReportId,
        }))
      );
    }

    return new NextResponse(
      JSON.stringify({
        status: 200,
        message: "Scouting report updated successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: `Error updating scouting report: ${error.message}`,
      }),
      { status: 500 }
    );
  }
};

export const DELETE = async (request, { params }) => {
  try {
    await connectDB();

    let { userId, scoutingReportId } = params;

    // Sanitize params
    userId = mongoSanitize.sanitize(userId);
    scoutingReportId = mongoSanitize.sanitize(scoutingReportId);

    // Validate IDs
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(scoutingReportId)
    ) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing user or scouting report ID",
        }),
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Check if the scouting report exists and belongs to the user
    const report = await ScoutingReport.findOneAndDelete({
      _id: scoutingReportId,
      athlete: userId,
    });
    if (!report) {
      return new NextResponse(
        JSON.stringify({
          message: "Scouting report not found or does not belong to user.",
        }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: "Scouting report deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error deleting match report: " + error.message,
      }),
      { status: 500 }
    );
  }
};
