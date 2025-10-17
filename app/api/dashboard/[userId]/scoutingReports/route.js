// app/api/dashboard/[userId]/scoutingReports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Division from "@/models/divisionModel";
import Video from "@/models/videoModel";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
const safeStr = (v) => (v == null ? "" : String(v)).trim();
const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function extractYouTubeId(raw) {
  const str = safeStr(raw);
  if (!str) return "";

  // If an <iframe> was pasted, extract the src first
  const iframe = str.match(
    /<iframe[\s\S]*?src\s*=\s*["']([^"']+)["'][\s\S]*?>/i
  );
  const urlStr = iframe ? iframe[1] : str;

  try {
    const u = new URL(urlStr);
    const host = (u.hostname || "").toLowerCase();
    const path = u.pathname || "";

    if (host.includes("youtu.be")) {
      const seg = path.split("/").filter(Boolean)[0];
      return seg || "";
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (path.startsWith("/embed/")) return path.split("/")[2] || "";
      if (path.startsWith("/shorts/")) return path.split("/")[2] || "";
    }
  } catch {
    /* ignore and try regex */
  }

  const m = (urlStr || "").match(
    /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([^&?/]+)/i
  );
  return m && m[1] ? m[1] : "";
}

function buildCanonicalUrl(url, videoId) {
  // Prefer a stable canonical watch URL for YouTube
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  const ustr = safeStr(url);
  if (!ustr) return "";
  try {
    // As a fallback, use the URL without its search params
    const u = new URL(ustr);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return ustr;
  }
}

function normalizeVideoInput(v) {
  if (!v || typeof v !== "object") return null;
  const url = safeStr(v.url ?? v.videoURL);
  const id = extractYouTubeId(url);
  const startSeconds = toNonNegInt(v.startSeconds);
  const videoId = id || new Types.ObjectId().toString(); // ensure required
  const urlCanonical = buildCanonicalUrl(url, id) || url || ""; // ensure required

  return {
    title: safeStr(v.title ?? v.videoTitle),
    notes: safeStr(v.notes ?? v.videoNotes),
    url,
    startSeconds,
    videoId,
    urlCanonical,
  };
}

/* ---------------- GET ---------------- */
export async function GET(_req, context) {
  const { userId } = await context.params; // App Router requires await
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid userId" }, { status: 400 });
  }

  await connectDB();

  try {
    const reports = await ScoutingReport.find({ createdById: userId })
      .populate({ path: "division", model: Division, select: "name gender" })
      .populate({
        path: "videos",
        model: Video,
        select: "title notes url urlCanonical startSeconds videoId",
      })
      .lean();

    return NextResponse.json(reports ?? [], { status: 200 });
  } catch (err) {
    console.error("GET scoutingReports error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* ---------------- POST ---------------- */
export async function POST(req, context) {
  const { userId } = await context.params;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid userId" }, { status: 400 });
  }

  await connectDB();

  try {
    const body = await req.json();

    if (!body?.matchType) {
      return NextResponse.json(
        { message: "matchType (style) is required" },
        { status: 400 }
      );
    }

    const division =
      typeof body.division === "string" && Types.ObjectId.isValid(body.division)
        ? body.division
        : undefined;

    const weightCategory =
      body.weightCategory ?? body.weightItemId ?? undefined;
    const weightLabel = body.weightLabel ?? undefined;
    const weightUnit = body.weightUnit ?? undefined;

    // Create the report first
    const report = new ScoutingReport({
      reportFor: Array.isArray(body.reportFor) ? body.reportFor : [],
      createdById: userId,
      createdByName: body.createdByName ?? "",
      matchType: body.matchType,

      division,
      weightCategory,
      weightItemId: weightCategory,
      weightLabel,
      weightUnit,

      // Scouting target athlete
      athleteFirstName: body.athleteFirstName ?? "",
      athleteLastName: body.athleteLastName ?? "",
      athleteNationalRank: body.athleteNationalRank ?? "",
      athleteWorldRank: body.athleteWorldRank ?? "",
      athleteClub: body.athleteClub ?? "",
      athleteCountry: body.athleteCountry ?? "",
      athleteRank: body.athleteRank ?? "",
      athleteGrip: body.athleteGrip ?? "",
      athleteAttacks: Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [],
      athleteAttackNotes: body.athleteAttackNotes ?? "",
      accessList: Array.isArray(body.accessList) ? body.accessList : [],
    });
    await report.save();

    // Persist new videos
    const newVideos = Array.isArray(body.newVideos) ? body.newVideos : [];
    const createdIds = [];

    for (const v of newVideos) {
      const norm = normalizeVideoInput(v);
      if (!norm || !norm.url) continue;

      const vid = new Video({
        title: norm.title,
        notes: norm.notes,
        url: norm.url,
        urlCanonical: norm.urlCanonical, // REQUIRED
        startSeconds: norm.startSeconds,
        videoId: norm.videoId, // REQUIRED
        report: report._id,
        createdBy: userId,
      });
      await vid.save();
      createdIds.push(vid._id);
    }

    if (createdIds.length) {
      await ScoutingReport.updateOne(
        { _id: report._id },
        { $addToSet: { videos: { $each: createdIds } } }
      );
    }

    return NextResponse.json(
      { message: "Scouting report created.", id: String(report._id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to create scouting report", error: err.message },
      { status: 500 }
    );
  }
}
