export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import ScoutingReport from "@/models/scoutingReportModel";
import User from "@/models/userModel";

/* ---------------- helpers ---------------- */
const stripHtml = (html = "") =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();

const dateFmt = (d) => {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    // Excel likes ISO or JS Date objects; we'll write text
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

// Make a best-effort YouTube watch URL if we only captured an id or embed URL
const toWatchUrl = (raw = "") => {
  const v = String(raw || "").trim();
  if (!v) return "";
  // already a normal https link
  if (/^https?:\/\//i.test(v)) return v;

  // bare YouTube id
  if (/^[A-Za-z0-9_-]{6,}$/i.test(v))
    return `https://www.youtube.com/watch?v=${v}`;

  // embed urls become watch
  const m = v.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i);
  if (m && m[1]) return `https://www.youtube.com/watch?v=${m[1]}`;

  return v;
};

function buildFilters(searchParams, currentUserId) {
  const familyMemberId = searchParams.get("familyMemberId");
  // Default: "my scouting reports" (createdBy me)
  const base = { createdById: currentUserId };

  if (familyMemberId) {
    // Restrict to this family member
    return {
      ...base,
      reportFor: {
        $elemMatch: { athleteId: familyMemberId, athleteType: "family" },
      },
    };
  }

  // If you ever support exporting all visible reports, adjust here.
  return base;
}

/* ---------------- GET -> Excel (.xlsx) ---------------- */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "1";

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists (defensive)
    const user = await User.findById(currentUser._id).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const filters = buildFilters(searchParams, String(currentUser._id));

    // Populate videos so we can export titles/notes/urls
    const reports = await ScoutingReport.find(filters)
      .populate("videos") // Video model has {title, notes (HTML), url, ...}
      .sort({ createdAt: -1 })
      .lean();

    if (!download) {
      // Non-download fallback returns JSON (handy for debugging)
      return NextResponse.json(
        { count: reports.length, reports },
        { status: 200 }
      );
    }

    // ---------- Build workbook ----------
    const wb = new ExcelJS.Workbook();
    wb.creator = "MatScout";
    wb.created = new Date();

    const ws = wb.addWorksheet("Scouting Reports", {
      properties: { defaultColWidth: 22 },
      pageSetup: { fitToPage: true, orientation: "landscape" },
    });

    ws.columns = [
      { header: "Match Type", key: "matchType", width: 18 },
      { header: "Division", key: "division", width: 26 },
      { header: "Weight", key: "weight", width: 18 },

      { header: "Athlete First", key: "athleteFirstName", width: 16 },
      { header: "Athlete Last", key: "athleteLastName", width: 16 },
      { header: "National Rank", key: "athleteNationalRank", width: 14 },
      { header: "World Rank", key: "athleteWorldRank", width: 12 },
      { header: "Club", key: "athleteClub", width: 18 },
      { header: "Country", key: "athleteCountry", width: 12 },
      { header: "Grip", key: "athleteGrip", width: 10 },

      { header: "Known Attacks", key: "athleteAttacks", width: 24 },
      { header: "Attack Notes (text)", key: "athleteAttackNotes", width: 40 },

      // ✅ New video columns (support multiple videos)
      { header: "Video Titles", key: "videoTitles", width: 28 },
      { header: "Video Notes (text)", key: "videoNotes", width: 40 },
      { header: "Video Links", key: "videoLinks", width: 42 },

      { header: "Created By", key: "createdByName", width: 18 },
      { header: "Created At", key: "createdAt", width: 14 },
      { header: "Updated At", key: "updatedAt", width: 14 },
    ];

    // Header style
    ws.getRow(1).font = { bold: true };

    for (const r of reports) {
      // Division pretty
      const divLabel =
        (r?.division && typeof r.division === "object" && r.division.name) ||
        (typeof r?.division === "string" ? r.division : "") ||
        "";

      // Weight snapshot
      const weightSnap = r?.weightLabel
        ? `${r.weightLabel}${r?.weightUnit ? ` ${r.weightUnit}` : ""}`
        : "";

      // Techniques
      const techs = Array.isArray(r?.athleteAttacks)
        ? r.athleteAttacks.join(", ")
        : "";

      // Notes (plain text)
      const notesText = stripHtml(r?.athleteAttackNotes);

      // ✅ Videos (array) → titles / notes / urls (multi-line)
      const vids = Array.isArray(r?.videos) ? r.videos : [];
      const vidTitles = vids
        .map((v) => (v?.title || "").trim())
        .filter(Boolean);
      const vidNotes = vids
        .map((v) => stripHtml(v?.notes || ""))
        .filter(Boolean);
      const vidUrls = vids
        .map((v) => (v?.url ? toWatchUrl(v.url) : ""))
        .filter(Boolean);

      // Row
      const row = ws.addRow({
        matchType: r.matchType || "",
        division: divLabel,
        weight: weightSnap,

        athleteFirstName: r.athleteFirstName || "",
        athleteLastName: r.athleteLastName || "",
        athleteNationalRank: r.athleteNationalRank || "",
        athleteWorldRank: r.athleteWorldRank || "",
        athleteClub: r.athleteClub || "",
        athleteCountry: r.athleteCountry || "",
        athleteGrip: r.athleteGrip || "",

        athleteAttacks: techs,
        athleteAttackNotes: notesText,

        // Multi-video fields (newline separated; wrap enabled below)
        videoTitles: vidTitles.join("\n"),
        videoNotes: vidNotes.join("\n---\n"),
        videoLinks: vidUrls.join("\n"),

        createdByName: r.createdByName || "",
        createdAt: dateFmt(r.createdAt),
        updatedAt: dateFmt(r.updatedAt),
      });

      // Wrap text for the larger cells
      ["athleteAttackNotes", "videoTitles", "videoNotes", "videoLinks"].forEach(
        (k) => {
          const cell = row.getCell(k);
          cell.alignment = { wrapText: true, vertical: "top" };
        }
      );
    }

    const buf = await wb.xlsx.writeBuffer();
    const filename = `scouting_reports_${Date.now()}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Export scouting reports error:", err);
    return NextResponse.json(
      { message: "Failed to export scouting reports" },
      { status: 500 }
    );
  }
}
