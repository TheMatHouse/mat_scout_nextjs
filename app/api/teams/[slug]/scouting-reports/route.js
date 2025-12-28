// app/api/teams/[slug]/scouting-reports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import TeamMember from "@/models/teamMemberModel";
import "@/models/divisionModel";
import "@/models/weightCategoryModel";

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------
const safeStr = (v) => (v == null ? "" : String(v)).trim();

const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function extractYouTubeId(raw) {
  const str = safeStr(raw);
  if (!str) return "";

  const iframe = str.match(
    /<iframe[\s\S]*?src\s*=\s*["']([^"']+)["'][\s\S]*?>/i
  );
  const urlStr = iframe ? iframe[1] : str;

  try {
    const u = new URL(urlStr);
    const host = (u.hostname || "").toLowerCase();
    const path = u.pathname || "";

    if (host.includes("youtu.be")) {
      return path.split("/").filter(Boolean)[0] || "";
    }
    if (host.includes("youtube.com")) {
      return (
        u.searchParams.get("v") ||
        (path.startsWith("/embed/") && path.split("/")[2]) ||
        (path.startsWith("/shorts/") && path.split("/")[2]) ||
        ""
      );
    }
  } catch {}

  const m = urlStr.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([^&?/]+)/i);
  return m?.[1] || "";
}

function buildCanonicalUrl(url, videoId) {
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return safeStr(url);
  }
}

function normalizeIncomingVideoForCreate(raw, reportId, userId) {
  if (!raw || typeof raw !== "object") return null;

  const url = safeStr(raw.url ?? raw.videoURL);
  const id = extractYouTubeId(url);
  const startSeconds = toNonNegInt(raw.startSeconds);

  return {
    title: safeStr(raw.title ?? raw.videoTitle),
    notes: safeStr(raw.notes ?? raw.videoNotes),
    url,
    urlCanonical: buildCanonicalUrl(url, id),
    startSeconds,
    videoId: id || new Types.ObjectId().toString(),
    report: reportId,
    createdBy: userId,
  };
}

// ============================================================
// POST: Create a Scouting Report
// ============================================================
export async function POST(req, context) {
  try {
    await connectDB();

    const { slug } = await context.params;
    const body = await req.json();

    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser?._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const seen = new Set();
    const reportFor = (body.reportFor || []).filter((r) => {
      const key = `${r.athleteId}-${r.athleteType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const createdByName = `${currentUser.firstName || ""} ${
      currentUser.lastName || ""
    }`.trim();

    const report = await TeamScoutingReport.create({
      ...body,
      reportFor,
      teamId: team._id,
      createdById: currentUser._id,
      createdByName,
      videos: [],
    });

    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    const videos = (body.newVideos || body.videos || [])
      .map((v) =>
        normalizeIncomingVideoForCreate(v, report._id, currentUser._id)
      )
      .filter(Boolean);

    if (videos.length) {
      const saved = await Video.insertMany(videos);
      report.videos = saved.map((v) => v._id);
      await report.save();
    }

    return NextResponse.json(
      { message: "Scouting report created", report },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST scouting report error:", err);
    return NextResponse.json(
      { message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// GET: List Scouting Reports (FIXED)
// ============================================================
export async function GET(_req, context) {
  try {
    await connectDB();

    const { slug } = await context.params;

    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const user = await getCurrentUserFromCookies();
    if (!user?._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ----- privilege -----
    const isOwner = String(team.user) === String(user._id);

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: user._id,
      familyMemberId: null,
    })
      .select("role")
      .lean();

    const role = membership?.role;
    const privileged = isOwner || role === "manager" || role === "coach";

    // ----- child IDs -----
    const childLinks = await TeamMember.find({
      teamId: team._id,
      userId: user._id,
      familyMemberId: { $ne: null },
    })
      .select("familyMemberId")
      .lean();

    const childIds = new Set(childLinks.map((m) => String(m.familyMemberId)));

    const reports = await TeamScoutingReport.find({ teamId: team._id })
      .populate("videos")
      .populate("division", "name label gender")
      .sort({ createdAt: -1 })
      .lean();

    const allowedAthleteIds = new Set([
      String(user._id),
      ...Array.from(childIds),
    ]);

    const visibleReports = privileged
      ? reports
      : reports.filter((r) => {
          if (!Array.isArray(r.reportFor)) return false;

          return r.reportFor.some((rf) => {
            const athleteId =
              rf?.athleteId?.toString?.() ?? String(rf?.athleteId);

            return allowedAthleteIds.has(athleteId);
          });
        });

    return NextResponse.json(
      { scoutingReports: visibleReports },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET scouting reports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
