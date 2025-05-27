"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/config/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";

export async function GET(request, { params }) {
  try {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const matchReports = await MatchReport.find();

    if (!matchReports) {
      return new NextResponse(
        JSON.stringify({ message: "No match reports found" }),
        { status: 404 }
      );
    }

    return new NextResponse(JSON.stringify({ matchReports }), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error getting match reports" + error.message,
      }),
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const { userId } = await params;
  const body = await request.json();
  const {
    athlete,
    createdBy,
    createdByName,
    matchType,
    eventName,
    matchDate,
    division,
    weightCategory,
    opponentName,
    opponentClub,
    opponentRank,
    opponentCountry,
    opponentGrip,
    opponentAttacks,
    opponentAttackNotes,
    athleteAttacks,
    athleteAttackNotes,
    result,
    score,
    // videoTitle,
    // videoURL,
    videos,
    isPublic,
  } = body;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "User not found",
          status: 404,
        })
      );
    }

    const newMatchReport = await MatchReport.create({
      athlete,
      createdBy,
      createdByName,
      matchType,
      eventName,
      matchDate,
      division,
      weightCategory,
      opponentName,
      opponentClub,
      opponentRank,
      opponentCountry,
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
      userId,
    });

    if (newMatchReport) {
      return new NextResponse(
        JSON.stringify({
          status: 201,
          message: "Match report created successfully",
          //userStyle: newUserStyle,
        })
      );
    }
    //return new NextResponse(JSON.stringify({ userId }));
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
}
