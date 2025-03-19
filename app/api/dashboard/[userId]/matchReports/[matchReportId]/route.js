"use server";
import { NextResponse } from "next/server";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import Technique from "@/models/techniquesModel";
import { Types } from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "@/config/mongo";

// Update a match report
export const PATCH = async (request, { params }) => {
  try {
    // connect to DB
    await connectDB();

    let { userId, matchReportId } = await params;

    // Sanitize params
    userId = mongoSanitize.sanitize(userId);
    matchReportId = mongoSanitize.sanitize(matchReportId);

    // Validate ObjectIds
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user or match ID" }),
        { status: 400 }
      );
    }

    // Validate request body
    if (!request.body) {
      return new NextResponse(
        JSON.stringify({ message: "Empty request body" }),
        { status: 400 }
      );
    }

    const body = await request.json();
    const sanitizedBody = mongoSanitize.sanitize(body);

    if (!sanitizedBody || Object.keys(sanitizedBody).length === 0) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON data" }),
        { status: 400 }
      );
    }

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
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON data" }),
        { status: 400 }
      );
    }

    // Find user and match report in parallel
    const [user, matchReport] = await Promise.all([
      User.findById(userId),
      MatchReport.findOne({ _id: matchReportId, athlete: userId }),
    ]);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    if (!matchReport) {
      return new NextResponse(
        JSON.stringify({ message: "Match Report not found" }),
        { status: 404 }
      );
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

    return new NextResponse(
      JSON.stringify({
        status: 200,
        message: "Scouting report updated successfully",
      })
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: `Error updating match report: ${error.message}`,
      }),
      {
        status: 500,
      }
    );
  }
};

export const DELETE = async (request, { params }) => {
  try {
    const { userId, matchReportId } = params;

    // Validate IDs
    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid or missing user or match report ID",
        }),
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Check if the match report exists and belongs to the user
    const match = await MatchReport.findOneAndDelete({
      _id: matchReportId,
      athlete: userId,
    });
    if (!match) {
      return new NextResponse(
        JSON.stringify({
          message: "Match report not found or does not belong to user.",
        }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: "Match report deleted successfully" }),
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
