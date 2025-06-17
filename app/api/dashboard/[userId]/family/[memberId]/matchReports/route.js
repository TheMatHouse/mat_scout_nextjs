// app/api/dashboard/[userId]/family/[memberId]/matchReports/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { Types } from "mongoose";

export const POST = async (req, context) => {
  await connectDB();

  const { userId, memberId } = context.params;

  try {
    const currentUser = await getCurrentUserFromCookies();

    if (!currentUser || currentUser._id.toString() !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(memberId)) {
      return NextResponse.json(
        { message: "Invalid member ID" },
        { status: 400 }
      );
    }

    const member = await FamilyMember.findOne({ _id: memberId, userId });

    if (!member) {
      return NextResponse.json(
        { message: "Family member not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
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
      video,
      isPublic,
    } = body;

    const newMatch = new MatchReport({
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
      video,
      isPublic,
      createdBy: currentUser._id,
      createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
      familyMember: member._id,
    });

    await newMatch.save();

    member.matchReports = member.matchReports || [];
    member.matchReports.push(newMatch._id);
    await member.save();

    return NextResponse.json(
      { message: "Match report created", match: newMatch },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating match report:", err);
    return NextResponse.json(
      { message: "Failed to create match report" },
      { status: 500 }
    );
  }
};
