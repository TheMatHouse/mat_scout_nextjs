"use server";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";

// GET - Return match reports for a specific user
export async function GET(request, { params }) {
  const { userId } = params;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user ID" }),
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const matchReports = await MatchReport.find({ athlete: userId }).sort({
      matchDate: -1,
    }); // Most recent first

    return new NextResponse(JSON.stringify(matchReports), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error getting match reports: " + error.message,
      }),
      { status: 500 }
    );
  }
}

// POST - Create a new match report for a user
export async function POST(request, { params }) {
  const { userId } = params;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user ID" }),
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const body = await request.json();
    const {
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
      isPublic,
    } = body;

    const newMatchReport = await MatchReport.create({
      athlete: user._id,
      createdBy: user._id,
      createdByName: `${user.firstName} ${user.lastName}`,
      matchType,
      eventName,
      matchDate: matchDate ? new Date(matchDate) : undefined,
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
      video: {
        videoTitle: body.videoTitle || "",
        videoURL: normalizeYouTubeUrl(body.videoURL || ""),
      },
      isPublic,
    });

    user.matchReports = user.matchReports || [];
    user.matchReports.push(newMatchReport._id);
    await user.save();

    return new NextResponse(
      JSON.stringify({
        status: 201,
        message: "Match report created successfully",
        matchReportId: newMatchReport._id,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Match report creation error:", error);
    return new NextResponse(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

// Optional helper to normalize YouTube share URLs
function normalizeYouTubeUrl(url) {
  if (!url) return "";
  try {
    const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
    const normalMatch = url.match(/v=([\w-]+)/);
    const id = shortMatch?.[1] || normalMatch?.[1];
    return id ? `https://www.youtube.com/watch?v=${id}` : url;
  } catch {
    return url;
  }
}
