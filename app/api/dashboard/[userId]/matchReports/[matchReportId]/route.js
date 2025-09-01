import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { ensureTechniques } from "@/lib/ensureTechniques";

export const dynamic = "force-dynamic";

// ---- helpers ----
const cleanList = (arr) => [
  ...new Set((arr || []).map((s) => String(s || "").trim()).filter(Boolean)),
];
const asLower = (arr) => arr.map((s) => s.toLowerCase());
const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

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

// PATCH: Update a user's own match report
export async function PATCH(request, context) {
  await connectDB();
  const { userId, matchReportId } = context.params || {};

  if (!isValidId(userId) || !isValidId(matchReportId)) {
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
    const body = await request.json();

    // Normalize techniques for storage (lowercase)
    const oppAttacksClean = body.opponentAttacks
      ? asLower(cleanList(body.opponentAttacks))
      : undefined;
    const athAttacksClean = body.athleteAttacks
      ? asLower(cleanList(body.athleteAttacks))
      : undefined;

    // Ensure techniques exist (create missing; no dup if unapproved exists)
    await ensureTechniques([
      ...cleanList(body.opponentAttacks || []),
      ...cleanList(body.athleteAttacks || []),
    ]);

    // Build a safe update document
    const updateDoc = {
      updatedAt: new Date(),
    };

    const allowed = [
      "matchType",
      "eventName",
      "matchDate",
      "division",
      "weightCategory",
      "opponentName",
      "opponentClub",
      "opponentRank",
      "opponentCountry",
      "opponentGrip",
      "opponentAttackNotes",
      "athleteAttackNotes",
      "result",
      "score",
      "isPublic",
    ];

    for (const key of allowed) {
      if (key in body) updateDoc[key] = body[key];
    }

    if (typeof body.matchDate === "string" && body.matchDate) {
      updateDoc.matchDate = new Date(body.matchDate);
    }

    // Techniques (normalized)
    if (oppAttacksClean) updateDoc.opponentAttacks = oppAttacksClean;
    if (athAttacksClean) updateDoc.athleteAttacks = athAttacksClean;

    // Video fields (map to nested structure)
    if ("videoTitle" in body || "videoURL" in body) {
      updateDoc.video = {
        videoTitle: body.videoTitle || "",
        videoURL: normalizeYouTubeUrl(body.videoURL || ""),
      };
    }

    const updated = await MatchReport.findOneAndUpdate(
      {
        _id: matchReportId,
        athleteId: userId,
        athleteType: "user",
        createdById: userId,
      },
      { $set: updateDoc },
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

// DELETE: Delete a user's own match report
export async function DELETE(_request, context) {
  await connectDB();
  const { userId, matchReportId } = context.params || {};

  if (!isValidId(userId) || !isValidId(matchReportId)) {
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
      athleteId: userId,
      athleteType: "user",
      createdById: userId,
    });

    if (!deleted) {
      return NextResponse.json(
        { message: "Match report not found" },
        { status: 404 }
      );
    }

    // Detach from user doc
    await User.findByIdAndUpdate(userId, {
      $pull: { matchReports: deleted._id },
    });

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
