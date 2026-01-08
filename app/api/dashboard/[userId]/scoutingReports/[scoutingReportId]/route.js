// app/api/dashboard/[userId]/scoutingReports/[scoutingReportId]/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import Video from "@/models/videoModel";
import { saveUnknownTechniques } from "@/lib/saveUnknownTechniques";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
const safeStr = (v) => (v == null ? "" : String(v)).trim();

const first24Hex = (v) =>
  typeof v === "string" ? (v.match(/[a-f0-9]{24}/i) || [])[0] : null;

// Build filters that match either ObjectId _or_ string _id (covers legacy docs)
const buildIdCandidates = (rawId) => {
  const candidates = [];
  const idStr = safeStr(rawId);
  if (!idStr) return candidates;

  const hex = first24Hex(idStr);
  if (hex) {
    try {
      candidates.push({ _id: new Types.ObjectId(hex) });
    } catch {
      /* ignore cast error; we'll still try string form */
    }
  }
  // Always also try raw string form
  candidates.push({ _id: idStr });
  return candidates;
};

// pull a param value robustly from params OR from the URL path as a fallback
const extractReportId = async (req, context) => {
  const p = (await context?.params) || context?.params || {};
  const keys = Object.keys(p || {});
  // try known names
  const fromParams =
    p.reportId ||
    p.id ||
    p.scoutingReportId ||
    p.scoutingReportsId ||
    (keys.length === 1 ? p[keys[0]] : null);
  if (fromParams) return safeStr(fromParams);

  // fallback: use the last segment of the path
  try {
    const path = new URL(req.url).pathname;
    const seg = safeStr(path.split("/").filter(Boolean).pop());
    return seg;
  } catch {
    return "";
  }
};

// best-effort normalize a division value (string id or {_id})
const normalizeDivisionId = (val) => {
  if (val == null || val === "") return "";
  let id = val;
  if (typeof id === "object") id = id._id || id.id || "";
  id = safeStr(id);
  return Types.ObjectId.isValid(id) ? id : "";
};

/* ---------------- PATCH ---------------- */
export async function PATCH(req, context) {
  await connectDB();

  const rawReportId = await extractReportId(req, context);
  const candidates = buildIdCandidates(rawReportId);

  if (!candidates.length) {
    return NextResponse.json(
      { message: "Invalid report ID", debug: { rawReportId } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    // Find doc by either id representation
    const report = await ScoutingReport.findOne({ $or: candidates });
    if (!report) {
      return NextResponse.json(
        { message: "Report not found", debug: { rawReportId, candidates } },
        { status: 404 }
      );
    }

    // Build update doc from allowed fields
    const update = {};

    if (body.matchType !== undefined) update.matchType = body.matchType;

    if (body.athleteFirstName !== undefined)
      update.athleteFirstName = body.athleteFirstName;
    if (body.athleteLastName !== undefined)
      update.athleteLastName = body.athleteLastName;
    if (body.athleteNationalRank !== undefined)
      update.athleteNationalRank = body.athleteNationalRank;
    if (body.athleteWorldRank !== undefined)
      update.athleteWorldRank = body.athleteWorldRank;

    // ✅ Division: accept string id or {_id}, safely cast to ObjectId
    if (body.division !== undefined) {
      const divId = normalizeDivisionId(body.division);
      if (divId) {
        update.division = new Types.ObjectId(divId);
      } else if (body.division === "" || body.division === null) {
        update.division = undefined; // allow clearing
      }
      // if invalid provided, silently ignore; or you could 400
    }

    if (body.athleteClub !== undefined) update.athleteClub = body.athleteClub;
    if (body.athleteCountry !== undefined)
      update.athleteCountry = body.athleteCountry;
    if (body.athleteRank !== undefined) update.athleteRank = body.athleteRank;
    if (body.athleteGrip !== undefined) update.athleteGrip = body.athleteGrip;
    if (body.athleteAttacks !== undefined)
      update.athleteAttacks = Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [];
    if (body.athleteAttackNotes !== undefined)
      update.athleteAttackNotes = body.athleteAttackNotes;
    if (body.accessList !== undefined)
      update.accessList = Array.isArray(body.accessList) ? body.accessList : [];

    // weight fields (keep alias in sync)
    if (body.weightCategory !== undefined) {
      update.weightCategory = body.weightCategory;
      update.weightItemId = body.weightCategory;
    }
    if (body.weightLabel !== undefined) update.weightLabel = body.weightLabel;
    if (body.weightUnit !== undefined) update.weightUnit = body.weightUnit;

    await ScoutingReport.updateOne({ _id: report._id }, { $set: update });

    // Save any newly-added techniques (pending approval)
    try {
      await saveUnknownTechniques(
        Array.isArray(body.athleteAttacks) ? body.athleteAttacks : []
      );
    } catch (e) {
      console.warn("[saveUnknownTechniques] scouting report PATCH failed:", e);
    }

    /* ------------ videos: create/update/delete ------------ */
    const updatedVideos = Array.isArray(body.updatedVideos)
      ? body.updatedVideos
      : [];
    const newVideos = Array.isArray(body.newVideos) ? body.newVideos : [];
    const deletedVideos = Array.isArray(body.deletedVideos)
      ? body.deletedVideos
      : [];

    // DELETE first
    if (deletedVideos.length) {
      const ids = deletedVideos
        .map((v) => safeStr(v))
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
      if (ids.length) {
        await Video.deleteMany({ _id: { $in: ids }, report: report._id });
      }
    }

    // UPDATE existing (by _id)
    for (const v of updatedVideos) {
      if (!v || !v._id) continue;
      const idStr = safeStr(v._id);
      if (!Types.ObjectId.isValid(idStr)) continue;

      const urlRaw = safeStr(v.url || v.videoURL);
      const startSeconds = Math.max(
        0,
        parseInt(
          typeof v.startSeconds === "number"
            ? v.startSeconds
            : v?.startSeconds || 0,
          10
        )
      );

      // compute urlCanonical & videoId
      let urlCanonical = urlRaw;
      let videoId = "";
      // YouTube id
      const m =
        urlRaw.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i) ||
        urlRaw.match(/youtube\.com\/shorts\/([^?]+)/i);
      if (m && m[1]) {
        videoId = m[1];
        urlCanonical = `https://www.youtube.com/embed/${videoId}`;
      }

      await Video.updateOne(
        { _id: idStr, report: report._id },
        {
          $set: {
            title: safeStr(v.title || v.videoTitle),
            notes: safeStr(v.notes || v.videoNotes),
            url: urlRaw,
            urlCanonical,
            videoId,
            startSeconds,
          },
        }
      );
    }

    // CREATE new
    for (const v of newVideos) {
      const urlRaw = safeStr(v.url || v.videoURL);
      if (!urlRaw) continue;

      const startSeconds = Math.max(
        0,
        parseInt(
          typeof v.startSeconds === "number"
            ? v.startSeconds
            : v?.startSeconds || 0,
          10
        )
      );

      // compute urlCanonical & videoId
      let urlCanonical = urlRaw;
      let videoId = "";
      const m =
        urlRaw.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i) ||
        urlRaw.match(/youtube\.com\/shorts\/([^?]+)/i);
      if (m && m[1]) {
        videoId = m[1];
        urlCanonical = `https://www.youtube.com/embed/${videoId}`;
      }

      await Video.create({
        title: safeStr(v.title || v.videoTitle),
        notes: safeStr(v.notes || v.videoNotes),
        url: urlRaw,
        urlCanonical,
        videoId,
        startSeconds,
        report: report._id,
        createdBy: report.createdById || undefined,
      });
    }

    return NextResponse.json(
      { message: "Scouting report updated." },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH scoutingReport error:", err);
    return NextResponse.json(
      { message: "Failed to update scouting report", error: err.message },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req, context) {
  await connectDB();

  const rawReportId = await extractReportId(req, context);
  const candidates = buildIdCandidates(rawReportId);

  if (!candidates.length) {
    return NextResponse.json(
      { message: "Invalid report ID", debug: { rawReportId } },
      { status: 400 }
    );
  }

  try {
    // 1) Confirm it exists using either id representation
    const doc = await ScoutingReport.findOne({ $or: candidates }).lean();
    if (!doc) {
      return NextResponse.json(
        { message: "Report not found", debug: { rawReportId, candidates } },
        { status: 404 }
      );
    }

    // 2) Delete linked videos
    await Video.deleteMany({ report: doc._id });

    // 3) Delete the report
    const res = await ScoutingReport.deleteOne({ _id: doc._id });

    if (res.deletedCount !== 1) {
      return NextResponse.json(
        { message: "Report not found", debug: { rawReportId, candidates } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Scouting report deleted." },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE scoutingReport error:", err);
    return NextResponse.json(
      { message: "Failed to delete scouting report", error: err.message },
      { status: 500 }
    );
  }
}
