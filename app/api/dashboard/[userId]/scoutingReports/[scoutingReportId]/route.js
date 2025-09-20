// app/api/dashboard/[userId]/scoutingReports/[reportId]/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";

export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
const first24Hex = (v) =>
  typeof v === "string" ? (v.match(/[a-f0-9]{24}/i) || [])[0] : null;

const safeStr = (v) => (v == null ? "" : String(v)).trim();

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
    const doc = await ScoutingReport.findOne({ $or: candidates });
    if (!doc) {
      return NextResponse.json(
        { message: "Report not found", debug: { rawReportId, candidates } },
        { status: 404 }
      );
    }

    // Build update doc from allowed fields
    const update = {
      ...(body.matchType !== undefined && { matchType: body.matchType }),

      ...(body.athleteFirstName !== undefined && {
        athleteFirstName: body.athleteFirstName,
      }),
      ...(body.athleteLastName !== undefined && {
        athleteLastName: body.athleteLastName,
      }),
      ...(body.athleteNationalRank !== undefined && {
        athleteNationalRank: body.athleteNationalRank,
      }),
      ...(body.athleteWorldRank !== undefined && {
        athleteWorldRank: body.athleteWorldRank,
      }),

      ...(body.division !== undefined && { division: body.division }),
      ...(body.athleteClub !== undefined && { athleteClub: body.athleteClub }),
      ...(body.athleteCountry !== undefined && {
        athleteCountry: body.athleteCountry,
      }),
      ...(body.athleteRank !== undefined && { athleteRank: body.athleteRank }),
      ...(body.athleteGrip !== undefined && { athleteGrip: body.athleteGrip }),
      ...(body.athleteAttacks !== undefined && {
        athleteAttacks: body.athleteAttacks,
      }),
      ...(body.athleteAttackNotes !== undefined && {
        athleteAttackNotes: body.athleteAttackNotes,
      }),
      ...(body.accessList !== undefined && { accessList: body.accessList }),
    };

    // weight fields (keep alias in sync)
    if (body.weightCategory !== undefined) {
      update.weightCategory = body.weightCategory;
      update.weightItemId = body.weightCategory;
    }
    if (body.weightLabel !== undefined) update.weightLabel = body.weightLabel;
    if (body.weightUnit !== undefined) update.weightUnit = body.weightUnit;

    await ScoutingReport.updateOne({ _id: doc._id }, { $set: update });

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
        {
          message: "Report not found",
          debug: {
            rawReportId,
            candidates,
            // NOTE: keep this debug while fixing; remove later
          },
        },
        { status: 404 }
      );
    }

    // 2) Delete by the same $or candidates
    const res = await ScoutingReport.deleteOne({ $or: candidates });

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
