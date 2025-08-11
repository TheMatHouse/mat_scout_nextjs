// app/api/records/style/[styleId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { isValidObjectId } from "mongoose";
import User from "@/models/userModel";
import Style from "@/models/styleModel";
import MatchReport from "@/models/matchReportModel";
import { getCurrentUser } from "@/lib/auth-server";
import { pdf } from "@react-pdf/renderer";
import StyleRecordPDF from "@/components/pdf/StyleRecordPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeResult(val) {
  const v = String(val || "")
    .trim()
    .toLowerCase();
  if (v === "won" || v === "win" || v === "w") return "win";
  if (v === "lost" || v === "loss" || v === "l") return "loss";
  if (v === "draw" || v === "tie" || v === "d") return "draw";
  return "";
}

// Fetch a remote image and embed as data URI so it always renders in the PDF
async function fetchImageAsDataURI(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch (e) {
    console.error("Logo fetch failed:", e);
    return "";
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { styleId } = await params; // Next.js params can be a Promise
    const decoded = decodeURIComponent(String(styleId || "")).trim();
    const allMode = /^all(-styles)?$/i.test(decoded); // support /style/all and /style/all-styles

    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const download = url.searchParams.get("download") === "1";

    // Logo handling (embed to avoid CORS/render issues)
    const logoHttpUrl =
      url.searchParams.get("logo") ||
      process.env.NEXT_PUBLIC_PDF_LOGO ||
      "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png";
    const embeddedLogo = await fetchImageAsDataURI(logoHttpUrl);

    // 1) Resolve user
    let userDoc;
    if (username) {
      userDoc = await User.findOne({ username }).select(
        "_id firstName lastName username allowPublic"
      );
      if (!userDoc)
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    } else {
      const me = await getCurrentUser();
      if (!me)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userDoc = await User.findById(me._id).select(
        "_id firstName lastName username"
      );
      if (!userDoc)
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2) Filters common to both modes
    const userId = userDoc._id;
    const userIdStr = String(userId);
    const ownerFilter = {
      $or: [
        { athleteId: userId },
        { createdById: userId },
        { athleteId: userIdStr }, // tolerate string-stored ids
        { createdById: userIdStr },
      ],
    };
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const maybeDate = Object.keys(dateFilter).length
      ? { matchDate: dateFilter }
      : {};

    // 3) Build query
    let matchTypeName = null;
    let styleDoc = null;
    const baseQuery = { ...ownerFilter, ...maybeDate };

    if (!allMode) {
      // Resolve style name (MatchReport uses matchType string)
      if (isValidObjectId(decoded)) {
        styleDoc = await Style.findById(decoded).select("_id styleName");
        if (!styleDoc)
          return NextResponse.json(
            { error: "Style not found" },
            { status: 404 }
          );
        matchTypeName = styleDoc.styleName;
      } else {
        const byName = await Style.findOne({
          styleName: new RegExp(`^${escapeRegex(decoded)}$`, "i"),
        }).select("_id styleName");
        matchTypeName = byName ? byName.styleName : decoded;
        if (byName) styleDoc = byName;
      }
      baseQuery.matchType = new RegExp(
        `^\\s*${escapeRegex(matchTypeName)}\\s*$`,
        "i"
      );
    } else {
      matchTypeName = "All Styles";
    }

    // 4) Query reports
    const reports = await MatchReport.find(baseQuery)
      .sort({ matchDate: -1, createdAt: -1 })
      .lean();

    // 5) Totals
    const totals = reports.reduce(
      (acc, r) => {
        const out = normalizeResult(r.result);
        if (out === "win") acc.wins += 1;
        else if (out === "loss") acc.losses += 1;
        else if (out === "draw") acc.draws += 1;
        return acc;
      },
      { wins: 0, losses: 0, draws: 0 }
    );

    // 6) Map rows for PDF
    const matches = reports.map((r) => ({
      ...(allMode ? { style: r.matchType || "" } : null), // include style column when "all"
      date: r.matchDate
        ? new Date(r.matchDate).toLocaleDateString("en-US")
        : "",
      eventName: r.eventName || "",
      opponent: r.opponentName || "",
      result: r.result || "",
      division: r.division || "",
      weight: r.weightCategory || "",
    }));

    // 7) Render PDF
    const userName = `${userDoc.firstName} ${userDoc.lastName}`.trim();
    const element = (
      <StyleRecordPDF
        logoUrl={embeddedLogo}
        userName={userName}
        styleName={matchTypeName}
        wins={totals.wins}
        losses={totals.losses}
        matches={matches}
        includeStyleColumn={allMode} // <-- show the Style column when /style/all
      />
    );
    const pdfBuffer = await pdf(element).toBuffer();

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          download ? "attachment" : "inline"
        }; filename="${encodeURIComponent(
          `${userDoc.username}_${allMode ? "all" : matchTypeName}_record.pdf`
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/records/style/[styleId] PDF failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
