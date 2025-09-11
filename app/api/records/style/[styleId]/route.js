// app/api/records/style/[styleId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { isValidObjectId } from "mongoose";
import User from "@/models/userModel";
import Style from "@/models/styleModel";
import MatchReport from "@/models/matchReportModel";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server"; // keep consistent with your existing auth here
import { pdf } from "@react-pdf/renderer";
import StyleRecordPDF from "@/components/pdf/StyleRecordPDF";
import PromotionsPDF from "@/components/pdf/PromotionsPDF";

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

// Embed remote image as data URI for PDF
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

    const { styleId } = await params; // Next.js 15: params can be a Promise
    const decoded = decodeURIComponent(String(styleId || "")).trim();
    const allMode = /^all(-styles)?$/i.test(decoded);

    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const familyMemberIdQS = url.searchParams.get("familyMemberId") || null; // may be null
    const userStyleId = url.searchParams.get("userStyleId") || null; // ✅ NEW
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const view = (url.searchParams.get("view") || "").toLowerCase();
    const download = url.searchParams.get("download") === "1";

    const logoHttpUrl =
      url.searchParams.get("logo") ||
      process.env.NEXT_PUBLIC_PDF_LOGO ||
      "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png";
    const embeddedLogo = await fetchImageAsDataURI(logoHttpUrl);

    // 1) Resolve owner user (parent account)
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

    // 2) If userStyleId is provided, load that exact doc as ground truth
    let forcedUserStyle = null;
    let effectiveFamilyMemberId = familyMemberIdQS; // may be overridden by the doc
    if (userStyleId && isValidObjectId(userStyleId)) {
      forcedUserStyle = await UserStyle.findOne({
        _id: userStyleId,
        userId: userDoc._id,
      }).lean();
      if (!forcedUserStyle) {
        return NextResponse.json(
          { error: "Style not found for this user" },
          { status: 404 }
        );
      }
      // If the doc carries a family member, prefer it
      if (forcedUserStyle.familyMemberId) {
        effectiveFamilyMemberId = String(forcedUserStyle.familyMemberId);
      }
    }

    // 3) Choose displayName: parent or family member
    let displayName = `${userDoc.firstName} ${userDoc.lastName}`.trim();
    let fam = null;
    if (effectiveFamilyMemberId) {
      fam = await FamilyMember.findOne({
        _id: effectiveFamilyMemberId,
        userId: userDoc._id,
      }).lean();
      if (fam) {
        const famName =
          [fam.firstName, fam.lastName].filter(Boolean).join(" ") ||
          fam.name ||
          "Family Member";
        displayName = famName;
      } else {
        // If invalid fam id was passed, we keep displayName as the parent,
        // but do not fail the request.
        console.warn(
          "PDF requested with invalid familyMemberId:",
          effectiveFamilyMemberId
        );
      }
    }

    // 4) Resolve style name (records + promotions). If userStyleId present, take it from the doc.
    let matchTypeName = null;
    let styleDoc = null;

    if (forcedUserStyle) {
      matchTypeName = forcedUserStyle.styleName || decoded || "Style";
    } else if (!allMode) {
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
    } else {
      matchTypeName = "All Styles";
    }

    // 5) Promotions view
    if (view === "promotions") {
      if (allMode) {
        return NextResponse.json(
          { error: "Promotions view is not supported for all-styles" },
          { status: 400 }
        );
      }

      let userStyle = forcedUserStyle;
      if (!userStyle) {
        // Find by style name + (optional) family member
        const findStyle = {
          userId: userDoc._id,
          styleName: new RegExp(`^${escapeRegex(matchTypeName)}$`, "i"),
        };
        if (effectiveFamilyMemberId)
          findStyle.familyMemberId = effectiveFamilyMemberId;
        userStyle = await UserStyle.findOne(findStyle).lean();
      }

      if (!userStyle) {
        return NextResponse.json(
          { error: "No style data found for this user and style" },
          { status: 404 }
        );
      }

      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      const promotions = Array.isArray(userStyle.promotions)
        ? userStyle.promotions
            .filter((p) => p?.promotedOn)
            .filter((p) => {
              const d = new Date(p.promotedOn);
              if (fromDate && d < fromDate) return false;
              if (toDate && d > toDate) return false;
              return true;
            })
            .sort((a, b) => new Date(a.promotedOn) - new Date(b.promotedOn))
        : [];

      const element = (
        <PromotionsPDF
          logoUrl={embeddedLogo}
          userName={displayName}
          styleName={matchTypeName}
          startDate={userStyle.startDate || null}
          currentRank={userStyle.currentRank || ""}
          promotions={promotions}
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
            `${userDoc.username}_${matchTypeName}_promotions.pdf`
          )}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ====== Records view ======
    // Owner filter (created by/for the parent account)
    const userId = userDoc._id;
    const userIdStr = String(userId);
    const ownerFilter = {
      $or: [
        { athleteId: userId },
        { createdById: userId },
        { athleteId: userIdStr },
        { createdById: userIdStr },
      ],
    };

    // Date filter
    const baseQuery = { ...ownerFilter };
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    if (Object.keys(dateFilter).length) baseQuery.matchDate = dateFilter;

    // If we resolved a family member (from query or userStyle doc), filter by that athlete
    if (effectiveFamilyMemberId) {
      baseQuery.athleteId = {
        $in: [effectiveFamilyMemberId, String(effectiveFamilyMemberId)],
      };
    }

    // Style filter when not "all"
    if (!allMode) {
      baseQuery.matchType = new RegExp(
        `^\\s*${escapeRegex(matchTypeName)}\\s*$`,
        "i"
      );
    }

    const reports = await MatchReport.find(baseQuery)
      .sort({ matchDate: -1, createdAt: -1 })
      .lean();

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

    const matches = reports.map((r) => ({
      ...(allMode ? { style: r.matchType || "" } : null),
      date: r.matchDate
        ? new Date(r.matchDate).toLocaleDateString("en-US")
        : "",
      eventName: r.eventName || "",
      opponent: r.opponentName || "",
      result: r.result || "",
      division: r.division || "",
      weight: r.weightCategory || "",
    }));

    const element = (
      <StyleRecordPDF
        logoUrl={embeddedLogo}
        userName={displayName}
        styleName={matchTypeName}
        wins={totals.wins}
        losses={totals.losses}
        matches={matches}
        includeStyleColumn={allMode}
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
