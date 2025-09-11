// app/api/userStyles/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// GET /api/userStyles?familyMemberId=optional
export async function GET(request) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const { searchParams } = new URL(request.url);
  const familyMemberId = searchParams.get("familyMemberId");

  const query = { userId: me._id };
  if (familyMemberId) {
    query.familyMemberId = familyMemberId;
  }

  // sort by most-recent promotion first, then createdAt
  const styles = await UserStyle.find(query)
    .sort({ lastPromotedOn: -1, createdAt: -1 })
    .lean();

  return json({ styles });
}

// POST /api/userStyles  (create OR update by (userId,familyMemberId,styleName))
export async function POST(request) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    styleName,
    // new schema
    startDate,
    currentRank,

    // existing fields
    division,
    weightClass,
    grip,
    favoriteTechnique,

    // optional
    familyMemberId,
  } = body || {};

  if (!styleName) return json({ error: "Style name is required" }, 400);

  // If creating for a family member, verify the family member belongs to this user.
  if (familyMemberId) {
    const fam = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: me._id,
    }).lean();
    if (!fam) return json({ error: "Invalid family member" }, 403);
  }

  // Upsert semantics based on (userId, familyMemberId, styleName)
  const filter = {
    userId: me._id,
    familyMemberId: familyMemberId || null,
    styleName,
  };

  let doc = await UserStyle.findOne(filter);
  if (!doc) {
    // create new
    doc = new UserStyle({
      ...filter,
      // apply fields (only set if provided)
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(currentRank ? { currentRank } : {}),
      ...(division ? { division } : {}),
      ...(weightClass ? { weightClass } : {}),
      ...(grip ? { grip } : {}),
      ...(favoriteTechnique ? { favoriteTechnique } : {}),
    });
  } else {
    // update existing
    if (startDate !== undefined)
      doc.startDate = startDate ? new Date(startDate) : undefined;
    if (currentRank !== undefined) doc.currentRank = currentRank || "";
    if (division !== undefined) doc.division = division || "";
    if (weightClass !== undefined) doc.weightClass = weightClass || "";
    if (grip !== undefined) doc.grip = grip || "";
    if (favoriteTechnique !== undefined)
      doc.favoriteTechnique = favoriteTechnique || "";
  }

  await doc.save(); // ensures pre('save') runs to sync lastPromotedOn/currentRank
  return json({ message: "Style saved", createdStyle: doc });
}
