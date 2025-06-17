import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Types } from "mongoose";
import User from "@/models/userModel";
import MatchReport from "@/models/matchReportModel";
import Technique from "@/models/techniquesModel";
import mongoSanitize from "express-mongo-sanitize";

// PATCH - Update a match report
export const PATCH = async (request, context) => {
  try {
    await connectDB();
    const { userId, matchReportId } = context.params;

    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return NextResponse.json(
        { message: "Invalid user or match report ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const matchReport = await MatchReport.findOne({
      _id: matchReportId,
      athlete: userId,
    });
    if (!matchReport)
      return NextResponse.json(
        { message: "Match report not found" },
        { status: 404 }
      );

    const body = await request.json();
    const sanitized = mongoSanitize.sanitize(body);

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
      video,
      isPublic,
    } = sanitized;

    // Ensure techniques are recorded
    const ensureTechniques = async (attacks) => {
      if (Array.isArray(attacks) && attacks.length > 0) {
        const existing = await Technique.find({
          techniqueName: { $in: attacks },
        }).distinct("techniqueName");
        const newTechs = attacks.filter((t) => !existing.includes(t));
        if (newTechs.length > 0) {
          await Technique.insertMany(
            newTechs.map((name) => ({ techniqueName: name }))
          );
        }
      }
    };

    await Promise.all([
      ensureTechniques(athleteAttacks),
      ensureTechniques(opponentAttacks),
    ]);

    Object.assign(matchReport, {
      matchType,
      eventName,
      matchDate,
      division,
      weightCategory,
      opponentName,
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
      video: {
        videoTitle: sanitized.videoTitle || "",
        videoURL: normalizeYouTubeUrl(sanitized.videoURL || ""),
      },
      isPublic,
    });

    await matchReport.save();

    return NextResponse.json(
      { message: "Match report updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { message: "Error updating report: " + error.message },
      { status: 500 }
    );
  }
};

// DELETE - Remove a match report
export const DELETE = async (request, context) => {
  try {
    await connectDB();
    const { userId, matchReportId } = context.params;

    if (
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(matchReportId)
    ) {
      return NextResponse.json(
        { message: "Invalid user or match report ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const match = await MatchReport.findOneAndDelete({
      _id: matchReportId,
      athlete: userId,
    });

    if (!match) {
      return NextResponse.json(
        { message: "Match report not found" },
        { status: 404 }
      );
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { matchReports: matchReportId },
    });

    return NextResponse.json(
      { message: "Match report deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { message: "Error deleting match report: " + error.message },
      { status: 500 }
    );
  }
};

// Utility to normalize YouTube URLs
const normalizeYouTubeUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/watch?v=${parsed.pathname.slice(1)}`;
    }
    if (
      parsed.hostname.includes("youtube.com") &&
      parsed.searchParams.has("v")
    ) {
      return `https://www.youtube.com/watch?v=${parsed.searchParams.get("v")}`;
    }
    return url;
  } catch {
    return url;
  }
};
