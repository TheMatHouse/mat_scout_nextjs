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
    // connect to DB
    await connectDB();

    let { userId, scoutingReportId } = await params;

    // Sanitize params
    userId = mongoSanitize.sanitize(userId);
    scoutingReportId = mongoSanitize.sanitize(scoutingReportId);

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

    const body = await request.json();

    // Sanitize request body
    const sanitizedBody = mongoSanitize.sanitize(body);

    // Destructure only after sanitization
    const {
      athlete,
      type,
      team,
      reportForAthleteFirstName,
      athleteEmail,
      createdBy,
      createdByName,
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

    if (!sanitizedBody) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON data" }),
        { status: 400 }
      );
    }

    // check if user exists
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // check if scouting report exists
    const scoutingReport = await ScoutingReport.findById(scoutingReportId);

    if (!scoutingReport) {
      return new NextResponse(
        JSON.stringify({ message: "Scouting Report nout found." }),
        { status: 404 }
      );
    }

    // check if report exists
    const reportExists = await ScoutingReport.findOne({
      _id: scoutingReportId,
      createdBy: userId,
    });

    if (reportExists) {
      // check if there are athlete attacks
      // Process athlete attacks (ensuring all exist in the Techniques collection)
      if (Array.isArray(athleteAttacks) && athleteAttacks.length > 0) {
        await Promise.all(
          athleteAttacks.map(async (attack) => {
            const attackExists = await Technique.findOne({
              techniqueName: attack,
            });
            if (!attackExists) {
              await Technique.create({ techniqueName: attack });
            }
          })
        );
      }

      const report = await ScoutingReport.findByIdAndUpdate(scoutingReportId, {
        team,
        createdbyName: createdByName,
        createdBy: createdBy,
        matchType,
        division,
        weightCategory,
        athleteFirstName,
        athleteLastName,
        athleteClub,
        athleteCountry,
        athleteRank,
        athleteGrip,
        athleteAttacks,
        athleteAttackNotes,
      });

      const updatedReport = await report.save();

      if (Array.isArray(videos) && videos.length > 0) {
        await Promise.all(
          videos.map(async (video) => {
            await Video.create({
              videoTitle: video.videoTitle,
              videoURL: video.videoURL,
              videoNotes: video.videoNotes,
              report: scoutingReportId,
            });
          })
        );
      }

      return new NextResponse(
        JSON.stringify({
          status: 200,
          message: "Scouting report updated successfully",
        })
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error updating scouting report: " + error.message,
      }),
      { status: 500 }
    );
  }
};
