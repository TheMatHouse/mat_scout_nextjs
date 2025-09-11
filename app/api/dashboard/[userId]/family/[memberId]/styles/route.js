// app/api/dashboard/[userId]/family/[memberId]/styles/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";
import UserStyle from "@/models/userStyleModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function computeDerived(style) {
  const s = { ...style };
  const promos = Array.isArray(s.promotions) ? s.promotions : [];
  if (!s.lastPromotedOn && promos.length > 0) {
    const latest = promos
      .filter((p) => p?.promotedOn)
      .sort((a, b) => new Date(b.promotedOn) - new Date(a.promotedOn))[0];
    if (latest?.promotedOn) s.lastPromotedOn = latest.promotedOn;
    if (!s.currentRank && latest?.rank) s.currentRank = latest.rank;
  }
  return s;
}

export async function GET(_req, { params }) {
  await connectDB();
  const { userId, memberId } = await params; // ✅ await params

  const me = await getCurrentUserFromCookies();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (String(me._id) !== String(userId))
    return json({ error: "Forbidden" }, 403);

  // Verify the family member belongs to this user
  const fam = await FamilyMember.findOne({
    _id: memberId,
    userId: me._id,
  }).lean();
  if (!fam) return json({ error: "Invalid family member" }, 404);

  try {
    const styles = await UserStyle.find({
      userId: me._id,
      familyMemberId: memberId,
    }).lean();

    // ✅ return a plain array (backward compatible with your UI)
    return json((styles || []).map(computeDerived));
  } catch (err) {
    console.error("GET family styles error:", err);
    return json({ error: "Failed to load styles" }, 500);
  }
}

export async function POST(req, { params }) {
  await connectDB();
  const { userId, memberId } = await params; // ✅ await params

  const me = await getCurrentUserFromCookies();
  if (!me) return json({ error: "Unauthorized" }, 401);
  if (String(me._id) !== String(userId))
    return json({ error: "Forbidden" }, 403);

  const fam = await FamilyMember.findOne({
    _id: memberId,
    userId: me._id,
  }).lean();
  if (!fam) return json({ error: "Invalid family member" }, 404);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    styleName,
    currentRank,
    startDate,
    // legacy fallbacks
    rank,
    promotionDate,
    division,
    weightClass,
    grip,
    favoriteTechnique,
  } = body || {};

  if (!styleName) return json({ error: "Style name is required" }, 400);

  const doc = {
    styleName,
    currentRank: currentRank ?? rank ?? "",
    startDate: startDate ? new Date(startDate) : undefined,
    division: division ?? "",
    weightClass: weightClass ?? "",
    grip: grip ?? "",
    favoriteTechnique: favoriteTechnique ?? "",
    userId: me._id,
    familyMemberId: memberId,
  };

  if (promotionDate) {
    const pd = new Date(promotionDate);
    doc.lastPromotedOn = pd;
    doc.promotions = [
      {
        rank: doc.currentRank || (rank ?? ""),
        promotedOn: pd,
        awardedBy: "",
        note: "",
      },
    ];
  }

  try {
    const created = await UserStyle.create(doc);
    return json({ message: "Style saved", createdStyle: created.toObject() });
  } catch (err) {
    console.error("POST family styles error:", err);
    return json({ error: "Failed to save style" }, 500);
  }
}
