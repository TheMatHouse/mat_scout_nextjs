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

// ----------------------------------------------------------
// YouTube / Video helpers (mirrors dashboard scouting route)
// ----------------------------------------------------------
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

/**
 * normalizeIncomingVideoForCreate
 * - raw: incoming video object from the client
 * - reportId: the TeamScoutingReport._id
 * - userId: the current user creating the report
 *
 * Returns a document ready to pass to Video.insertMany(...)
 */
function normalizeIncomingVideoForCreate(raw, reportId, userId) {
  if (!raw || typeof raw !== "object") return null;

  const url = safeStr(raw.url ?? raw.videoURL);
  const id = extractYouTubeId(url);
  const startSeconds = toNonNegInt(raw.startSeconds);
  const videoId = id || new Types.ObjectId().toString(); // ensure required
  const urlCanonical = buildCanonicalUrl(url, id) || url || ""; // ensure required

  return {
    title: safeStr(raw.title ?? raw.videoTitle),
    notes: safeStr(raw.notes ?? raw.videoNotes),
    url,
    urlCanonical,
    startSeconds,
    videoId,
    // Link back to this team scouting report and creator
    report: reportId,
    createdBy: userId,
  };
}

// ============================================================
// POST: Create a Scouting Report (plaintext or encrypted)
// ============================================================
export async function POST(req, context) {
  try {
    await connectDB();

    const { params } = context;
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { message: "Missing team slug" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Handle slug normalization (_ vs -)
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Deduplicate reportFor
    const seen = new Set();
    const dedupedReportFor = (body.reportFor || []).filter((entry) => {
      const key = `${entry.athleteId}-${entry.athleteType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ✅ Normalize optional crypto block
    const cryptoBlock =
      body.crypto && typeof body.crypto === "object"
        ? {
            version: body.crypto.version || 1,
            alg: body.crypto.alg || "TBK-AES-GCM-256",
            ivB64: body.crypto.ivB64 || "",
            ciphertextB64: body.crypto.ciphertextB64 || "",
            wrappedReportKeyB64: body.crypto.wrappedReportKeyB64 || "",
            teamKeyVersion:
              body.crypto.teamKeyVersion != null
                ? body.crypto.teamKeyVersion
                : 1,
          }
        : null;

    // Base doc from body (works for plaintext teams)
    const createdByName = `${currentUser.firstName || ""} ${
      currentUser.lastName || ""
    }`.trim();

    const doc = {
      ...body,
      reportFor: dedupedReportFor,
      teamId: team._id,
      createdById: currentUser._id,
      createdByName,
      videos: [],
    };

    // If crypto is present, enforce that sensitive fields are blank on the server.
    if (cryptoBlock) {
      doc.crypto = cryptoBlock;
      doc.athleteFirstName = "";
      doc.athleteLastName = "";
      doc.athleteNationalRank = "";
      doc.athleteWorldRank = "";
      doc.athleteClub = "";
      doc.athleteCountry = "";
      doc.athleteGrip = "";
      doc.athleteAttacks = [];
      doc.athleteAttackNotes = "";
    }

    // Create the report without videos first
    const newReport = await TeamScoutingReport.create(doc);

    // Save unknown techniques (plaintext flow will still work;
    // encrypted flow may have empty athleteAttacks here, which is OK)
    await saveUnknownTechniques(
      Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
    );

    // -------------------------------
    // Save new videos and link to report
    // -------------------------------
    const incomingVideosRaw =
      (Array.isArray(body.newVideos) && body.newVideos) ||
      (Array.isArray(body.videos) && body.videos) ||
      [];

    if (incomingVideosRaw.length) {
      const normalizedDocs = [];
      for (const raw of incomingVideosRaw) {
        if (!raw || (!raw.url && !raw.videoURL)) continue;
        const videoDoc = normalizeIncomingVideoForCreate(
          raw,
          newReport._id,
          currentUser._id
        );
        if (!videoDoc || !videoDoc.url) continue;
        normalizedDocs.push(videoDoc);
      }

      if (normalizedDocs.length) {
        const videoDocs = await Video.insertMany(normalizedDocs);
        newReport.videos = videoDocs.map((v) => v._id);
        await newReport.save();
      }
    }

    // In-app notifications + emails per assignment (unchanged)
    // ... your existing notification/email logic lives here ...

    return NextResponse.json(
      { message: "Scouting report created", report: newReport },
      { status: 201 }
    );
  } catch (err) {
    console.error("Scouting Report POST error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

// ============================================================
// GET: List all Scouting Reports for a Team
// ============================================================
export async function GET(_request, context) {
  try {
    const { params } = context;
    const { slug } = await params;
    await connectDB();

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

    // Shape each report with a friendly divisionLabel
    const scoutingReports = rawReports.map((r) => {
      if (r.divisionLabel) return r;

      let divisionLabel = "";

      if (r.division && typeof r.division === "object") {
        const name = String(r.division.label || r.division.name || "").trim();
        const gender = String(r.division.gender || "").toLowerCase();

        let genderPretty = "";
        if (gender === "male") genderPretty = "Men";
        else if (gender === "female") genderPretty = "Women";
        else if (gender === "coed" || gender === "open") genderPretty = "Coed";

        divisionLabel = name
          ? genderPretty
            ? `${name} - ${genderPretty}`
            : name
          : "";
      }

      return {
        ...r,
        divisionLabel,
      };
    });

    // ✅ Include crypto metadata in results but never decrypt server-side
    return NextResponse.json({ scoutingReports }, { status: 200 });
  } catch (err) {
    console.error("GET team scoutingReports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch scouting reports", error: err.message },
      { status: 500 }
    );
  }
}
