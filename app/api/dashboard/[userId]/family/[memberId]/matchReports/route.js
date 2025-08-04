import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import FamilyMember from "@/models/familyMemberModel";
import User from "@/models/userModel";
import { Types } from "mongoose";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

// GET: Return match reports for a family member
export async function GET(req, context) {
  const { userId, memberId } = await context.params;

  try {
    await connectDB();

    if (
      !userId ||
      !memberId ||
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(memberId)
    ) {
      return NextResponse.json(
        { message: "Invalid or missing userId/memberId" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const reports = await MatchReport.find({
      athleteId: memberId,
      athleteType: "family",
    }).sort({ matchDate: -1 });

    return NextResponse.json(reports);
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to load match reports", error: err.message },
      { status: 500 }
    );
  }
}

// POST: Create a new match report for a family member
export async function POST(request, context) {
  await connectDB();

  const { memberId } = await context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (!memberId || !Types.ObjectId.isValid(memberId)) {
    return NextResponse.json(
      { message: "Invalid or missing member ID" },
      { status: 400 }
    );
  }

  const familyMember = await FamilyMember.findOne({
    _id: memberId,
    userId: currentUser._id, // ensure it's their family member
  });

  if (!familyMember) {
    return NextResponse.json(
      { error: "Family member not found or unauthorized" },
      { status: 404 }
    );
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
  } = body;

  // ✅ Save any new techniques to DB
  await saveUnknownTechniques([
    ...(Array.isArray(athleteAttacks) ? athleteAttacks : []),
    ...(Array.isArray(opponentAttacks) ? opponentAttacks : []),
  ]);

  const newReport = await MatchReport.create({
    athleteId: memberId,
    athleteType: "family",
    createdById: currentUser._id,
    createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
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
      videoTitle: videoTitle || "",
      videoURL: normalizeYouTubeUrl(videoURL || ""),
    },
    isPublic,
  });

  return NextResponse.json(newReport, { status: 201 });
}

// Helper to normalize YouTube share URLs
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
