// app/api/dashboard/[userId]/family/[memberId]/styles/[styleId]/route.js
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
      .filter((p) => p && p.promotedOn)
      .sort((a, b) => new Date(b.promotedOn) - new Date(a.promotedOn))[0];
    if (latest && latest.promotedOn) s.lastPromotedOn = latest.promotedOn;
    if (!s.currentRank && latest && latest.rank) s.currentRank = latest.rank;
  }
  return s;
}

async function assertOwnership(me, userId, memberId, styleId) {
  if (String(me._id) !== String(userId)) {
    return { error: "Forbidden", status: 403 };
  }

  const fam = await FamilyMember.findOne({
    _id: memberId,
    userId: me._id,
  }).lean();
  if (!fam) return { error: "Invalid family member", status: 404 };

  const style = await UserStyle.findOne({
    _id: styleId,
    userId: me._id,
    familyMemberId: memberId,
  }).lean();

  if (!style) return { error: "Style not found", status: 404 };
  return { style };
}

export async function GET(_req, { params }) {
  await connectDB();
  const { userId, memberId, styleId } = await params; // await params (Next.js 15)
  const me = await getCurrentUserFromCookies();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const own = await assertOwnership(me, userId, memberId, styleId);
  if (own.error) return json({ error: own.error }, own.status);

  return json({ style: computeDerived(own.style) });
}

export async function PATCH(req, { params }) {
  await connectDB();
  const { userId, memberId, styleId } = await params; // await params
  const me = await getCurrentUserFromCookies();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const own = await assertOwnership(me, userId, memberId, styleId);
  if (own.error) return json({ error: own.error }, own.status);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const update = {};

  // New fields
  if ("currentRank" in body) update.currentRank = body.currentRank ?? "";
  if ("startDate" in body) {
    update.startDate = body.startDate ? new Date(body.startDate) : undefined;
  }

  // Legacy fallbacks
  if ("rank" in body && !("currentRank" in body)) {
    update.currentRank = body.rank ?? "";
  }
  if ("promotionDate" in body) {
    update.lastPromotedOn = body.promotionDate
      ? new Date(body.promotionDate)
      : undefined;
  }

  // Simple string fields
  const simpleFields = [
    "division",
    "weightClass",
    "grip",
    "favoriteTechnique",
    "styleName",
  ];
  for (const k of simpleFields) {
    if (k in body) update[k] = body[k] ?? "";
  }

  const updated = await UserStyle.findByIdAndUpdate(styleId, update, {
    new: true,
    lean: true,
  });

  return json({
    message: "Style updated",
    updatedStyle: computeDerived(updated),
  });
}

export async function DELETE(_req, { params }) {
  await connectDB();
  const { userId, memberId, styleId } = await params; // await params
  const me = await getCurrentUserFromCookies();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const own = await assertOwnership(me, userId, memberId, styleId);
  if (own.error) return json({ error: own.error }, own.status);

  await UserStyle.deleteOne({ _id: styleId });
  return json({ message: "Style deleted" });
}
