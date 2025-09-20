// app/api/dashboard/[userId]/matchReports/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import matchReport from "@/models/matchReportModel";

// helpers
const inferGenderFromName = (nameRaw) => {
  const name = String(nameRaw || "").toLowerCase();
  if (/\b(men|male|boys?)\b/.test(name)) return "male";
  if (/\b(women|female|girls?)\b/.test(name)) return "female";
  if (/\bM[0-9]+\b/i.test(name)) return "male";
  if (/\bF[0-9]+\b/i.test(name)) return "female";
  if (/\bcoed\b/.test(name)) return "coed";
  if (
    /\b(u[0-9]+|under\s*[0-9]+|bantam|intermediate|juvenile|cadet|junior)\b/.test(
      name
    )
  ) {
    return "coed";
  }
  return "coed";
};
const genderWord = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : "Coed";

export async function GET(_req, ctx) {
  try {
    const { userId } = ctx.params || {};
    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    await connectDB();

    const docs = await matchReport
      .find({ createdById: userId })
      .populate({ path: "division", select: "name gender" })
      .populate({
        path: "weightCategory",
        select: "unit items._id items.label",
      })
      .sort({ matchDate: -1, createdAt: -1 })
      .lean();

    const result = (docs || []).map((d) => {
      let divisionDisplay = "—";
      if (d?.division?.name) {
        const g = d?.division?.gender || inferGenderFromName(d.division.name);
        divisionDisplay = `${d.division.name} — ${genderWord(g)}`;
      }

      // Prefer saved snapshot; else try to resolve from weightCategory.items
      let weightDisplay =
        d?.weightLabel && d.weightLabel.trim()
          ? `${d.weightLabel}${d?.weightUnit ? ` ${d.weightUnit}` : ""}`
          : "";

      if (!weightDisplay && d?.weightItemId && d?.weightCategory?.items) {
        const found = d.weightCategory.items.find(
          (it) => String(it._id) === String(d.weightItemId)
        );
        if (found?.label) {
          const unit = d.weightCategory?.unit || "";
          weightDisplay = `${found.label}${unit ? ` ${unit}` : ""}`;
        }
      }

      return { ...d, divisionDisplay, weightDisplay: weightDisplay || "—" };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("GET /api/dashboard/[userId]/matchReports error:", err);
    return NextResponse.json(
      { message: "Failed to fetch match reports" },
      { status: 500 }
    );
  }
}

export async function POST(req, ctx) {
  try {
    const { userId } = ctx.params || {};
    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    await connectDB();

    const body = await req.json();

    const doc = await matchReport.create({
      // who
      createdById: userId,
      createdByName: body.createdByName || "",
      athleteId: body.athleteid || body.familyMemberId || userId,
      athleteType: body.familyMemberId ? "family" : "user",

      // context
      style: body.style, // optional
      matchType: body.matchType,
      eventName: body.eventName,
      matchDate: body.matchDate,

      // ranks (labels from form)
      myRank: body.myRank || "",
      opponentRank: body.opponentRank || "",

      // opponent
      opponentName: body.opponentName || "",
      opponentClub: body.opponentClub || "",
      opponentCountry: body.opponentCountry ?? "", // <-- ensure string
      opponentGrip: body.opponentGrip || "",
      opponentAttacks: Array.isArray(body.opponentAttacks)
        ? body.opponentAttacks
        : [],
      opponentAttackNotes: body.opponentAttackNotes || "",
      athleteAttacks: Array.isArray(body.athleteAttacks)
        ? body.athleteAttacks
        : [],
      athleteAttackNotes: body.athleteAttackNotes || "",

      // result
      result: body.result || "",
      score: body.score || "",

      // video
      video: {
        videoTitle: body.video?.videoTitle || body.videoTitle || "",
        videoURL: body.video?.videoURL || body.videoURL || "",
      },

      isPublic: !!body.isPublic,

      // division + weight refs + snapshot
      division: body.division || null,
      weightCategory: body.weightCategory || null,
      weightItemId: body.weightItemId || null,
      weightLabel: body.weightLabel || "",
      weightUnit: body.weightUnit || "",
    });

    return NextResponse.json(
      { ok: true, message: "Match report created", id: String(doc._id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/dashboard/[userId]/matchReports error:", err);
    return NextResponse.json(
      { message: "Failed to create match report" },
      { status: 500 }
    );
  }
}
