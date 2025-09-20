// app/api/records/scouting/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth-server";

import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import ScoutingReport from "@/models/scoutingReportModel";
import Division from "@/models/divisionModel";
import WeightCategory from "@/models/weightCategoryModel";

import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
const genderLabel = (g) => {
  const s = String(g || "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};
const divisionPretty = (div) => {
  if (!div || typeof div !== "object") return "";
  const name = div.name || "";
  const g = genderLabel(div.gender);
  return name ? (g ? `${name} — ${g}` : name) : "";
};
const ensureWeightDisplay = (label, unit) => {
  if (!label) return "";
  const low = String(label).toLowerCase();
  if (low.includes("kg") || low.includes("lb")) return label;
  return unit ? `${label} ${unit}` : label;
};
const stripHtml = (html = "") =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------- route ---------------- */
export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const username = url.searchParams.get("username"); // optional public view
    const familyMemberId = url.searchParams.get("familyMemberId") || null; // optional
    const styleName =
      url.searchParams.get("style") ||
      url.searchParams.get("matchType") ||
      null; // optional
    const from = url.searchParams.get("from"); // optional (ISO)
    const to = url.searchParams.get("to"); // optional (ISO)
    const download = url.searchParams.get("download") === "1"; // default: inline

    // 1) Resolve owner (parent) user
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

    // 2) Optional family member (for naming only, filter later)
    let fam = null;
    if (familyMemberId && isValidObjectId(familyMemberId)) {
      fam = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: userDoc._id,
      }).lean();
    }

    // 3) Build query
    const q = {
      // created by this user (matches your dashboard filter)
      createdById: { $in: [userDoc._id, String(userDoc._id)] },
    };

    if (familyMemberId) {
      // reports with reportFor[].athleteId OR legacy athleteId field
      q.$or = [
        {
          "reportFor.athleteId": {
            $in: [familyMemberId, String(familyMemberId)],
          },
        },
        { athleteId: { $in: [familyMemberId, String(familyMemberId)] } },
      ];
    }

    if (styleName) {
      q.matchType = new RegExp(`^\\s*${escapeRegex(styleName)}\\s*$`, "i");
    }

    // date filter (createdAt)
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    if (Object.keys(dateFilter).length) q.createdAt = dateFilter;

    // 4) Fetch + populate division
    const reports = await ScoutingReport.find(q)
      .sort({ createdAt: -1 })
      .populate({ path: "division", model: Division, select: "name gender" })
      .lean();

    // 5) Weight category cache (fallback when no snapshot)
    const needWeights = reports.filter(
      (r) => !r?.weightLabel && r?.weightCategory && r?.weightItemId
    );
    const uniqueCatIds = Array.from(
      new Set(
        needWeights
          .map((r) => String(r.weightCategory))
          .filter((id) => isValidObjectId(id))
      )
    );
    let weightCatMap = new Map();
    if (uniqueCatIds.length) {
      const cats = await WeightCategory.find({ _id: { $in: uniqueCatIds } })
        .select("_id unit items")
        .lean();
      weightCatMap = new Map(cats.map((c) => [String(c._id), c]));
    }

    // 6) Prepare rows
    const reportRows = [];
    const videoRows = [];

    for (const r of reports) {
      const divisionDisplay =
        typeof r.division === "object" && r.division
          ? divisionPretty(r.division)
          : "";

      let weightDisplay = ensureWeightDisplay(r.weightLabel, r.weightUnit);
      if (!weightDisplay && r.weightCategory && r.weightItemId) {
        const cat = weightCatMap.get(String(r.weightCategory));
        if (cat && Array.isArray(cat.items)) {
          const item =
            cat.items.find(
              (it) =>
                String(it._id) === String(r.weightItemId) ||
                String(it.label).toLowerCase() ===
                  String(r.weightItemId).toLowerCase()
            ) || null;
          if (item?.label) {
            const unit = r.weightUnit || cat.unit || "";
            weightDisplay = ensureWeightDisplay(item.label, unit);
          }
        }
      }

      const attacks = Array.isArray(r.athleteAttacks)
        ? r.athleteAttacks.join(", ")
        : "";
      const createdOn = r.createdAt ? new Date(r.createdAt) : null;

      reportRows.push({
        reportId: String(r._id),
        style: r.matchType || "",
        division: divisionDisplay || "",
        weight: weightDisplay || "",
        athleteFirstName: r.athleteFirstName || "",
        athleteLastName: r.athleteLastName || "",
        athleteCountry: r.athleteCountry || "",
        athleteClub: r.athleteClub || "",
        nationalRank: r.athleteNationalRank || "",
        worldRank: r.athleteWorldRank || "",
        myRank: r.athleteRank || "", // if you standardize later, populate from canonical code/label
        grip: r.athleteGrip || "",
        attacks,
        notes: stripHtml(r.athleteAttackNotes || ""),
        createdBy: r.createdByName || "",
        createdAt: createdOn
          ? `${createdOn.toLocaleDateString(
              "en-US"
            )} ${createdOn.toLocaleTimeString("en-US")}`
          : "",
      });

      const vids = Array.isArray(r.videos) ? r.videos : [];
      vids.forEach((v, idx) => {
        videoRows.push({
          reportId: String(r._id),
          style: r.matchType || "",
          athlete: [r.athleteFirstName, r.athleteLastName]
            .filter(Boolean)
            .join(" "),
          index: idx + 1,
          title: v?.title || "",
          url: v?.url || "",
          notes: stripHtml(v?.notes || ""),
        });
      });
    }

    // 7) Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "MatScout";
    wb.created = new Date();

    // Sheet 1: Scouting Reports
    const ws1 = wb.addWorksheet("Scouting Reports", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws1.columns = [
      { header: "Report ID", key: "reportId", width: 24 },
      { header: "Style", key: "style", width: 16 },
      { header: "Division", key: "division", width: 24 },
      { header: "Weight", key: "weight", width: 16 },
      { header: "Athlete First", key: "athleteFirstName", width: 16 },
      { header: "Athlete Last", key: "athleteLastName", width: 16 },
      { header: "Country", key: "athleteCountry", width: 14 },
      { header: "Club", key: "athleteClub", width: 20 },
      { header: "National Rank", key: "nationalRank", width: 14 },
      { header: "World Rank", key: "worldRank", width: 14 },
      { header: "My Rank", key: "myRank", width: 16 },
      { header: "Grip", key: "grip", width: 10 },
      { header: "Known Attacks", key: "attacks", width: 28 },
      { header: "Notes", key: "notes", width: 40 },
      { header: "Created By", key: "createdBy", width: 20 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    ws1.getRow(1).font = { bold: true };
    reportRows.forEach((row) => ws1.addRow(row));

    // Sheet 2: Videos (one row per video)
    const ws2 = wb.addWorksheet("Videos", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws2.columns = [
      { header: "Report ID", key: "reportId", width: 24 },
      { header: "Style", key: "style", width: 16 },
      { header: "Athlete", key: "athlete", width: 24 },
      { header: "#", key: "index", width: 6 },
      { header: "Title", key: "title", width: 32 },
      { header: "URL", key: "url", width: 42 },
      { header: "Notes", key: "notes", width: 50 },
    ];
    ws2.getRow(1).font = { bold: true };
    videoRows.forEach((row) => ws2.addRow(row));

    // 8) Output
    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `${
          download ? "attachment" : "inline"
        }; filename="${encodeURIComponent(
          `${
            fam
              ? `${userDoc.username}_${fam.firstName || fam.name || "family"}`
              : userDoc.username
          }_scouting_reports.xlsx`
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/records/scouting Excel failed:", err);
    return NextResponse.json(
      { error: "Failed to generate Excel" },
      { status: 500 }
    );
  }
}
