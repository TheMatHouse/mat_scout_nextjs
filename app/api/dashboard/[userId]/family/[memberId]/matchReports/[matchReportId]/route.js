import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import { Types } from "mongoose";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

// PATCH: Update a family member's match report
export async function PATCH(request, context) {
  await connectDB();

  const { userId, memberId, matchReportId } = await context.params;

  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId) ||
    !Types.ObjectId.isValid(matchReportId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // ✅ Save new techniques, if any
    await saveUnknownTechniques([
      ...(Array.isArray(updates.athleteAttacks) ? updates.athleteAttacks : []),
      ...(Array.isArray(updates.opponentAttacks)
        ? updates.opponentAttacks
        : []),
    ]);

    const updated = await MatchReport.findOneAndUpdate(
      {
        _id: matchReportId,
        athleteId: memberId,
        athleteType: "family",
        createdById: userId,
      },
      {
        ...updates,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { message: "Match report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Match report updated successfully",
        matchReportId: updated._id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating match report:", error);
    return NextResponse.json(
      { message: "Failed to update match report" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a family member's match report
export async function DELETE(request, context) {
  await connectDB();

  const { userId, memberId, matchReportId } = await context.params;

  if (
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId) ||
    !Types.ObjectId.isValid(matchReportId)
  ) {
    return NextResponse.json(
      { message: "Invalid ID(s) provided" },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await MatchReport.findOneAndDelete({
      _id: matchReportId,
      athleteId: memberId,
      athleteType: "family",
      createdById: userId,
    });

    if (!deleted) {
      return NextResponse.json(
        { message: "Match report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Match report deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting match report:", error);
    return NextResponse.json(
      { message: "Failed to delete match report" },
      { status: 500 }
    );
  }
}
