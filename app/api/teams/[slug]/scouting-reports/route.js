// app/api/teams/[slug]/scouting-reports/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import "@/models/divisionModel";
import "@/models/weightCategoryModel";

/* -------------------------------------------------------
   YouTube helpers
------------------------------------------------------- */
const safeStr = (v) => (v == null ? "" : String(v).trim());

function extractYouTubeId(raw) {
  const str = safeStr(raw);
  if (!str) return "";

  // If <iframe> was pasted
  const iframe = str.match(/<iframe[\s\S]*?src=["']([^"']+)["']/i);
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
  } catch {}

  const m = (urlStr || "").match(
    /(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([^&?/]+)/i
  );
  return m && m[1] ? m[1] : "";
}

function buildCanonicalUrl(url, videoId) {
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  const ustr = safeStr(url);
  if (!ustr) return "";
  try {
    const u = new URL(ustr);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return ustr;
  }
}

const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/* -------------------------------------------------------
   Normalize incoming videos for POST
------------------------------------------------------- */
function normalizeIncomingVideoForCreate(raw, reportId, userId, encrypted) {
  if (!raw || typeof raw !== "object") return null;

  const url = safeStr(raw.url ?? raw.videoURL);
  const id = extractYouTubeId(url);
  const urlCanonical = buildCanonicalUrl(url, id);
  const startSeconds = toNonNegInt(raw.startSeconds);

  return {
    title: safeStr(raw.title ?? raw.videoTitle),
    notes: encrypted ? "" : safeStr(raw.notes ?? raw.videoNotes),
    url,
    urlCanonical,
    videoId: id || new Types.ObjectId().toString(),
    startSeconds,
    report: reportId,
    createdBy: userId,
  };
}

/* ============================================================
   POST — Create a Scouting Report (supports encryption)
============================================================ */
export async function POST(req, context) {
  try {
    await connectDB();

    const { slug } = await context.params;
    const body = await req.json();

    // ----- Team lookup -----
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // ----- Auth -----
    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ----- Dedupe reportFor -----
    const seen = new Set();
    const dedupedReportFor = (body.reportFor || []).filter((e) => {
      const k = `${e.athleteId}-${e.athleteType}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // ----- Sensitive body (always encrypted if TBK present) -----
    const sensitive = {
      athleteFirstName: safeStr(body.athleteFirstName),
      athleteLastName: safeStr(body.athleteLastName),
      athleteNationalRank: safeStr(body.athleteNationalRank),
      athleteWorldRank: safeStr(body.athleteWorldRank),
      athleteClub: safeStr(body.athleteClub),
      athleteCountry: safeStr(body.athleteCountry),
      athleteGrip: safeStr(body.athleteGrip),
      athleteAttacks: Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [],
      athleteAttackNotes: safeStr(body.athleteAttackNotes),
    };

    // ----- Encrypt if crypto exists -----
    const encrypted = !!(body.crypto && body.crypto.ciphertextB64);

    const doc = {
      matchType: body.matchType || "",
      division: body.division || null,
      weightCategory: body.weightCategory || null,
      weightLabel: body.weightLabel || "",
      weightUnit: body.weightUnit || "",
      reportFor: dedupedReportFor,
      teamId: team._id,
      createdById: currentUser._id,
      createdByName: `${currentUser.firstName || ""} ${
        currentUser.lastName || ""
      }`.trim(),
      videos: [],
    };

    if (encrypted) {
      doc.crypto = {
        version: body.crypto.version || 1,
        alg: body.crypto.alg || "TBK-AES-GCM-256",
        ivB64: body.crypto.ivB64 || "",
        ciphertextB64: body.crypto.ciphertextB64 || "",
        wrappedReportKeyB64: body.crypto.wrappedReportKeyB64 || "",
        teamKeyVersion:
          body.crypto.teamKeyVersion != null ? body.crypto.teamKeyVersion : 1,
      };

      // Blank ALL sensitive fields
      doc.athleteFirstName = "";
      doc.athleteLastName = "";
      doc.athleteNationalRank = "";
      doc.athleteWorldRank = "";
      doc.athleteClub = "";
      doc.athleteCountry = "";
      doc.athleteGrip = "";
      doc.athleteAttacks = [];
      doc.athleteAttackNotes = "";
    } else {
      // plaintext fallback
      Object.assign(doc, sensitive);
    }

    // ----- Create report -----
    const newReport = await TeamScoutingReport.create(doc);

    // Save unknown techniques
    await saveUnknownTechniques(sensitive.athleteAttacks);

    // ----- Handle videos -----
    const incomingVideos =
      (Array.isArray(body.newVideos) && body.newVideos) ||
      (Array.isArray(body.videos) && body.videos) ||
      [];

    if (incomingVideos.length) {
      const normalized = incomingVideos
        .map((v) =>
          normalizeIncomingVideoForCreate(
            v,
            newReport._id,
            currentUser._id,
            encrypted
          )
        )
        .filter(Boolean);

      if (normalized.length) {
        const docs = await Video.insertMany(normalized);
        newReport.videos = docs.map((v) => v._id);
        await newReport.save();
      }
    }

    return NextResponse.json(
      { message: "Scouting report created", report: newReport },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST scouting report error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

/* ============================================================
   GET — List all scouting reports for a team
============================================================ */
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

    const rawReports = await TeamScoutingReport.find({ teamId: team._id })
      .populate("videos")
      .populate("division", "name label gender")
      .sort({ createdAt: -1 })
      .lean();

    const reports = rawReports.map((r) => {
      let divisionLabel = "";
      if (r.division && typeof r.division === "object") {
        const name = safeStr(r.division.label || r.division.name);
        const gender = safeStr(r.division.gender).toLowerCase();
        const g =
          gender === "male"
            ? "Men"
            : gender === "female"
            ? "Women"
            : gender === "coed" || gender === "open"
            ? "Coed"
            : "";
        divisionLabel = name ? (g ? `${name} - ${g}` : name) : "";
      }

      return {
        ...r,
        divisionLabel,
      };
    });

    return NextResponse.json({ scoutingReports: reports }, { status: 200 });
  } catch (err) {
    console.error("GET scouting reports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
