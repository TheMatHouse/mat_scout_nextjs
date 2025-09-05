// app/api/dashboard/[userId]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import User from "@/models/userModel";
import { ensureTechniques } from "@/lib/ensureTechniques";

export const dynamic = "force-dynamic";

const cleanList = (arr) => [
  ...new Set((arr || []).map((s) => String(s || "").trim()).filter(Boolean)),
];

const asLower = (arr) => arr.map((s) => s.toLowerCase());

// ---------- POST: create a scouting report ----------
export async function POST(req, context) {
  await connectDB();
  const { userId } = context.params || {};
  let body;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user ID" },
        { status: 400 }
      );
    }

    body = await req.json();

    const {
      reportFor = [],
      createdByName,
      matchType,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      division,
      weightCategory,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks = [],
      athleteAttackNotes,
      accessList = [],
      videos = [],
      newVideos = [],
    } = body || {};

    // Normalize attacks (store lowercase in report)
    const athleteAttacksClean = asLower(cleanList(athleteAttacks));

    // Ensure techniques exist (approved-only suggestions are handled elsewhere)
    await ensureTechniques(cleanList(athleteAttacks));

    // Create the report first (without videos)
    const report = await ScoutingReport.create({
      reportFor,
      createdById: userId,
      createdByName: createdByName,
      matchType,
      athleteFirstName,
      athleteLastName,
      athleteNationalRank,
      athleteWorldRank,
      division,
      weightCategory,
      athleteClub,
      athleteCountry,
      athleteRank,
      athleteGrip,
      athleteAttacks: athleteAttacksClean,
      athleteAttackNotes,
      accessList,
      videos: [],
    });

    // Link the report to the user
    await User.findByIdAndUpdate(userId, {
      $addToSet: { scoutingReports: report._id },
    });

    // Save and link videos (accept either body.videos or body.newVideos)
    const incoming =
      Array.isArray(videos) && videos.length
        ? videos
        : Array.isArray(newVideos)
        ? newVideos
        : [];
    if (incoming.length) {
      const created = await Video.insertMany(
        incoming.map((v) => ({
          title: v.title || "",
          notes: v.notes || "",
          url: v.url || "",
          report: report._id,
          createdBy: userId,
        })),
        { ordered: false }
      );

      await ScoutingReport.findByIdAndUpdate(report._id, {
        $set: { videos: created.map((x) => x._id) },
      });
    }

    return NextResponse.json(
      { message: "Scouting report created successfully." },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST scoutingReports error:", err);
    return NextResponse.json(
      { message: "Server error", error: err.message, body },
      { status: 500 }
    );
  }
}

// ---------- GET: all scouting reports created by this user ----------
export async function GET(_request, context) {
  await connectDB();
  const { userId } = (await context.params) || {};

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user ID" },
        { status: 400 }
      );
    }

    const scoutingReports = await ScoutingReport.find({ createdById: userId })
      .populate("videos")
      .sort({ createdAt: -1 });

    return NextResponse.json(scoutingReports, { status: 200 });
  } catch (err) {
    console.error("GET scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
