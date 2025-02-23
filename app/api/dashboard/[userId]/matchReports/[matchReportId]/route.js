"use server";
import { NextResponse } from "next/server";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import { Types } from "mongoose";
import { ObjectId } from "mongodb";
import { connectDB } from "@/config/mongo";
import { revalidatePath } from "next/cache";

// Update a match report
export const PATCH = async (request, { params }) => {
  try {
    const { userId, matchReportId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    if (!matchReportId || !Types.ObjectId.isValid(matchReportId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing match report id" })
      );
    }

    if (!matchReportId || !Types.ObjectId.isValid(matchReportId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing match report id" })
      );
    }
    if (!request.body) {
      return new NextResponse(
        JSON.stringify({ message: "Empty request body" }),
        { status: 400 }
      );
    }

    const body = await request.json();

    const matchType = body.matchType;
    const eventName = body.eventName;
    const matchDate = body.matchDate;
    const opponentName = body.opponentName;
    const division = body.division;
    const weightCategory = body.weightCategory;
    const opponentClub = body.opponentClub;
    const opponentCountry = body.opponentCountry;
    const opponentRank = body.opponentRank;
    const opponentGrip = body.opponentGrip;
    const opponentAttacks = body.opponentAttacks;
    const opponentAttackNotes = body.opponentAttackNotes;
    const athleteAttacks = body.athleteAttacks;
    const athleteAttackNotes = body.athleteAttackNotes;
    const result = body.result;
    const score = body.score;
    const videoTitle = body.videoTitle;
    const videoURL = body.videoURL;
    const isPublic = body.isPublic;

    if (!body) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid JSON data" }),
        { status: 400 }
      );
    }

    connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const matchReport = await MatchReport.findById(matchReportId);
    if (!matchReport) {
      return new NextResponse(
        JSON.stringify({ message: "Match report not found." }),
        { status: 404 }
      );
    }

    const reportToUpdate = await MatchReport.findOne({
      _id: matchReportId,
      athlete: userId,
    });

    console.log("athlete attack notes ", athleteAttackNotes);
    if (reportToUpdate) {
      reportToUpdate.matchType = matchType || reportToUpdate.matchType;
      reportToUpdate.eventName = eventName || reportToUpdate.eventName;
      reportToUpdate.matchDate = matchDate || reportToUpdate.matchDate;
      reportToUpdate.opponentName = opponentName || reportToUpdate.opponentName;
      reportToUpdate.division = division || reportToUpdate.division;
      reportToUpdate.weightCategory =
        weightCategory || reportToUpdate.weightCategory;
      reportToUpdate.opponentClub = opponentClub || reportToUpdate.opponentClub;
      reportToUpdate.opponentCountry =
        opponentCountry || reportToUpdate.opponentCountry;
      reportToUpdate.opponentRank = opponentRank || reportToUpdate.opponentRank;
      reportToUpdate.opponentGrip = opponentGrip || reportToUpdate.opponentGrip;
      reportToUpdate.opponentAttacks =
        opponentAttacks || reportToUpdate.opponentAttacks;
      reportToUpdate.opponentAttackNotes =
        opponentAttackNotes || reportToUpdate.opponentAttackNotes;
      reportToUpdate.athleteAttacks =
        athleteAttacks || reportToUpdate.athleteAttacks;
      reportToUpdate.athleteAttackNotes;
      athleteAttackNotes || reportToUpdate.athleteAttackNotes;
      reportToUpdate.result = result || reportToUpdate.result;
      reportToUpdate.score = score || reportToUpdate.score;
      reportToUpdate.videoTitle = videoTitle || reportToUpdate.videoTitle;
      reportToUpdate.videoURL = videoURL || reportToUpdate.videoURL;
      reportToUpdate.isPublic = isPublic || reportToUpdate.isPublic;

      const updatedMatchReport = await reportToUpdate.save();

      if (updatedMatchReport) {
        return new NextResponse(
          JSON.stringify({ message: "Match report updated successfully!!!!" }),
          {
            status: 200,
          }
        );
      }
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error updating match report: " + error.message,
      }),
      { status: 500 }
    );
  }
};
