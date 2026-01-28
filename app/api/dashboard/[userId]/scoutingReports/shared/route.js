// app/api/dashboard/[userId]/scoutingReports/shared/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ScoutingReport from "@/models/scoutingReportModel";
import PrivateShare from "@/models/privateShareModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";

// ensure refs exist
import "@/models/divisionModel";
import "@/models/weightCategoryModel";

/* helpers */
const sid = (v) => (v == null ? "" : String(v).trim());

const inferGenderFromName = (nameRaw) => {
  const name = String(nameRaw || "").toLowerCase();
  if (/\b(men|male|boys?)\b/.test(name)) return "male";
  if (/\b(women|female|girls?)\b/.test(name)) return "female";
  if (/\bM[0-9]+\b/i.test(name)) return "male";
  if (/\bF[0-9]+\b/i.test(name)) return "female";
  if (/\bcoed\b/.test(name)) return "coed";
  if (
    /\b(u[0-9]+|under\s*[0-9]+|bantam|intermediate|juvenile|cadet|junior)\b/.test(
      name,
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
    const p = await ctx.params;
    const userId = sid(p?.userId);
    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    await connectDB();

    /* -------------------------------------------------
       Resolve family members for this user
       ------------------------------------------------- */
    const familyMembers = await FamilyMember.find({ userId })
      .select("_id")
      .lean();

    const familyIds = familyMembers.map((f) => String(f._id));

    /* -------------------------------------------------
       Load active shares
       ------------------------------------------------- */
    const shares = await PrivateShare.find({
      documentType: "personal-scout",
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      $or: [
        {
          "sharedWith.athleteType": "user",
          "sharedWith.athleteId": userId,
        },
        {
          "sharedWith.athleteType": "family",
          "sharedWith.athleteId": { $in: familyIds },
        },
      ],
    }).lean();

    if (!shares.length) {
      return NextResponse.json([], { status: 200 });
    }

    /* -------------------------------------------------
       Split ALL vs ONE per owner
       ------------------------------------------------- */
    const allOwners = new Set();
    const oneByOwner = {};

    for (const s of shares) {
      const ownerId = String(s.ownerId);

      if (s.scope === "all") {
        allOwners.add(ownerId);
      } else if (s.scope === "one" && s.documentId) {
        if (!oneByOwner[ownerId]) oneByOwner[ownerId] = [];
        oneByOwner[ownerId].push(String(s.documentId));
      }
    }

    const ownerIds = Array.from(
      new Set([...allOwners, ...Object.keys(oneByOwner)]),
    );

    /* -------------------------------------------------
       Load owners
       ------------------------------------------------- */
    const owners = await User.find({ _id: { $in: ownerIds } })
      .select("_id name username")
      .lean();

    const ownerMap = {};
    for (const o of owners) ownerMap[String(o._id)] = o;

    /* -------------------------------------------------
       Load reports per owner
       ------------------------------------------------- */
    const result = [];

    for (const ownerId of ownerIds) {
      let query;

      if (allOwners.has(ownerId)) {
        query = { createdBy: ownerId };
      } else {
        query = {
          _id: { $in: oneByOwner[ownerId] || [] },
        };
      }

      const docs = await ScoutingReport.find(query)
        .populate({ path: "division", select: "name gender" })
        .populate({
          path: "weightCategory",
          select: "unit items._id items.label",
        })
        .sort({ matchDate: -1, createdAt: -1 })
        .lean();

      const hydrated = (docs || []).map((d) => {
        let divisionDisplay = "—";
        if (d?.division?.name) {
          const g = d?.division?.gender || inferGenderFromName(d.division.name);
          divisionDisplay = `${d.division.name} — ${genderWord(g)}`;
        }

        let weightDisplay =
          d?.weightLabel && d.weightLabel.trim()
            ? `${d.weightLabel}${d?.weightUnit ? ` ${d.weightUnit}` : ""}`
            : "";

        if (!weightDisplay && d?.weightItemId && d?.weightCategory?.items) {
          const found = d.weightCategory.items.find(
            (it) => String(it._id) === String(d.weightItemId),
          );
          if (found?.label) {
            const unit = d.weightCategory?.unit || "";
            weightDisplay = `${found.label}${unit ? ` ${unit}` : ""}`;
          }
        }

        return {
          ...d,
          divisionDisplay,
          weightDisplay: weightDisplay || "—",
        };
      });

      result.push({
        owner: ownerMap[ownerId] || { _id: ownerId },
        scope: allOwners.has(ownerId) ? "all" : "one",
        reports: hydrated,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(
      "GET /api/dashboard/[userId]/scoutingReports/shared error:",
      err,
    );
    return NextResponse.json(
      { message: "Failed to fetch shared scouting reports" },
      { status: 500 },
    );
  }
}
