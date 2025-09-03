// app/api/dashboard/[userId]/matchReports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import { ensureTechniques } from "@/lib/ensureTechniques";

export const dynamic = "force-dynamic";

// ---------- Helpers ----------
function normalizeYouTubeUrl(url) {
  if (!url) return "";
  try {
    const short = url.match(/youtu\.be\/([\w-]+)/)?.[1];
    const norm = url.match(/[?&]v=([\w-]+)/)?.[1];
    const id = short || norm;
    return id ? `https://www.youtube.com/watch?v=${id}` : url;
  } catch {
    return url;
  }
}

const cleanList = (arr) => [
  ...new Set((arr || []).map((s) => String(s || "").trim()).filter(Boolean)),
];

const asLower = (arr) => arr.map((s) => s.toLowerCase());

// ---------- GET: all match reports for a user ----------
export async function GET(_request, context) {
  await connectDB();
  const { userId } = await context.params; // <-- Next 15 requires await

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const matchReports = await MatchReport.find({
      athleteId: userId,
      athleteType: "user",
    }).sort({ matchDate: -1 });

    return NextResponse.json(matchReports, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error getting match reports", error: error.message },
      { status: 500 }
    );
  }
}

// ---------- POST: create a new match report ----------
export async function POST(request, context) {
  await connectDB();
  const { userId } = await context.params; // <-- Next 15 requires await

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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
      videoTitle,
      videoURL,
    } = body || {};

    // Clean & normalize attacks for report storage (lowercase)
    const oppAttacksClean = asLower(cleanList(opponentAttacks));
    const athAttacksClean = asLower(cleanList(athleteAttacks));

    // Ensure any typed techniques exist (create if missing; no dup if unapproved exists)
    await ensureTechniques([
      ...cleanList(opponentAttacks),
      ...cleanList(athleteAttacks),
    ]);

    const newMatchReport = await MatchReport.create({
      athleteId: user._id,
      athleteType: "user",
      createdById: user._id,
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
      opponentAttacks: oppAttacksClean,
      opponentAttackNotes,
      athleteAttacks: athAttacksClean,
      athleteAttackNotes,
      result,
      score,
      video: {
        videoTitle: videoTitle || "",
        videoURL: normalizeYouTubeUrl(videoURL || ""),
      },
      isPublic: !!isPublic,
    });

    // Link the report to the user
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { matchReports: newMatchReport._id },
    });

    return NextResponse.json(
      {
        message: "Match report created successfully",
        matchReportId: newMatchReport._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Match report creation error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
