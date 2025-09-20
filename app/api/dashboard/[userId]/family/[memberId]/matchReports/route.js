// app/api/dashboard/[userId]/family/[memberId]/matchReports/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import matchReport from "@/models/matchReportModel";
import division from "@/models/divisionModel"; // alias in your codebase may be "@/models/division"
import weightCategory from "@/models/weightCategoryModel"; // if you renamed to "@/models/weightCategory", update import

function err(status, message) {
  return NextResponse.json({ ok: false, message }, { status });
}

// GET: list all family match reports (returns an ARRAY)
export async function GET(_req, ctx) {
  try {
    const { userId, memberId } = await ctx.params; // Next 15
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || String(currentUser._id) !== String(userId)) {
      return err(401, "Unauthorized");
    }

    const rows = await matchReport
      .find(
        { athleteType: "family", athleteId: memberId },
        {
          // project the main fields you show in tables/cards
          matchType: 1,
          eventName: 1,
          matchDate: 1,
          division: 1,
          weightCategory: 1,
          weightLabel: 1,
          weightUnit: 1,
          myRank: 1,
          opponentRank: 1,
          opponentName: 1,
          opponentCountry: 1,
          result: 1,
          score: 1,
          video: 1,
          createdAt: 1,
        }
      )
      .sort({ matchDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error("GET family match reports error:", e);
    return err(500, "Failed to fetch match reports");
  }
}

// POST: create a family match report
export async function POST(req, ctx) {
  try {
    const { userId, memberId } = await ctx.params;
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || String(currentUser._id) !== String(userId)) {
      return err(401, "Unauthorized");
    }

    const body = await req.json();

    // Basic payload; front-end already sends validated fields.
    const doc = {
      athleteType: "family",
      athleteId: memberId,

      createdById: currentUser._id,
      createdByName: `${currentUser.firstName || ""} ${
        currentUser.lastName || ""
      }`.trim(),

      // match context
      matchType: body.matchType,
      eventName: body.eventName,
      matchDate: body.matchDate ? new Date(body.matchDate) : new Date(),

      // ranks (already label strings from form)
      myRank: body.myRank || "",
      opponentRank: body.opponentRank || "",

      // opponent
      opponentName: body.opponentName,
      opponentClub: body.opponentClub || "",
      opponentCountry: body.opponentCountry || "",
      opponentGrip: body.opponentGrip || "",
      opponentAttacks: Array.isArray(body.opponentAttacks)
        ? body.opponentAttacks
        : [],
      opponentAttackNotes: body.opponentAttackNotes || "",

      // athlete notes
      athleteAttacks: Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [],
      athleteAttackNotes: body.athleteAttackNotes || "",

      // result
      result: body.result || "",
      score: body.score || "",

      // video (store in nested object like your model)
      video: {
        videoTitle: body.videoTitle || "",
        videoNotes: body.videoNotes || "",
        videoURL: body.videoURL || "",
      },

      // division & weight refs
      division: body.division || null,
      weightCategory: body.weightCategory || null,

      // snapshot
      weightLabel: body.weightLabel || "",
      weightUnit: body.weightUnit || "",

      isPublic: !!body.isPublic,
    };

    // Optional server-side sanity checks:
    if (doc.division) {
      const d = await division.findById(doc.division).lean();
      if (!d) return err(400, "Invalid division");
    }
    if (doc.weightCategory) {
      const wc = await weightCategory.findById(doc.weightCategory).lean();
      if (!wc) return err(400, "Invalid weight category");
    }

    const saved = await matchReport.create(doc);
    return NextResponse.json(
      { ok: true, message: "Match report saved", id: String(saved._id) },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST family match report error:", e);
    return err(500, "Failed to save match report");
  }
}
