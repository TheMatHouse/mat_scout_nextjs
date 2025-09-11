// app/api/userStyles/[id]/promotions/route.js
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

async function assertOwnership(me, styleId) {
  const style = await UserStyle.findById(styleId).lean();
  if (!style) return { error: "Style not found", status: 404 };

  if (String(style.userId) === String(me._id) && !style.familyMemberId) {
    return { style };
  }

  if (style.familyMemberId) {
    const fam = await FamilyMember.findOne({
      _id: style.familyMemberId,
      userId: me._id,
    }).lean();
    if (fam) return { style };
  }

  return { error: "Forbidden", status: 403 };
}

// POST /api/userStyles/:id/promotions
export async function POST(request, { params }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  const own = await assertOwnership(me, id);
  if (own.error) return json({ error: own.error }, own.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { rank, promotedOn, awardedBy, note, proofUrl } = body || {};
  if (!rank || !promotedOn) {
    return json({ error: "rank and promotedOn are required" }, 400);
  }

  const doc = await UserStyle.findById(id);
  if (!doc) return json({ error: "Style not found" }, 404);

  const pDate = new Date(promotedOn);
  if (doc.startDate && pDate < doc.startDate) {
    return json({ error: "Promotion date is before start date" }, 422);
  }

  doc.promotions.push({
    rank,
    promotedOn: pDate,
    ...(awardedBy ? { awardedBy } : {}),
    ...(note ? { note } : {}),
    ...(proofUrl ? { proofUrl } : {}),
  });

  // Recompute derived fields by latest promotion date
  doc.promotions.sort(
    (a, b) => new Date(a.promotedOn) - new Date(b.promotedOn)
  );
  const latest = doc.promotions[doc.promotions.length - 1] || null;
  doc.currentRank = latest?.rank || doc.currentRank || "";
  doc.lastPromotedOn = latest?.promotedOn || doc.lastPromotedOn || null;

  await doc.save();
  return json({ message: "Promotion added", style: doc });
}

// DELETE /api/userStyles/:id/promotions?promotionId=... OR ?rank=...&promotedOn=...
export async function DELETE(request, { params }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  const own = await assertOwnership(me, id);
  if (own.error) return json({ error: own.error }, own.status);

  const url = new URL(request.url);
  const promotionId = url.searchParams.get("promotionId");
  const rank = url.searchParams.get("rank");
  const promotedOn = url.searchParams.get("promotedOn"); // ISO string

  if (!promotionId && !(rank && promotedOn)) {
    return json({ error: "Provide promotionId or rank+promotedOn" }, 400);
  }

  const doc = await UserStyle.findById(id);
  if (!doc) return json({ error: "Style not found" }, 404);

  let removed = false;

  if (promotionId) {
    const before = doc.promotions?.length || 0;
    doc.promotions = (doc.promotions || []).filter(
      (p) => String(p._id) !== String(promotionId)
    );
    removed = doc.promotions.length !== before;
  } else {
    const ts = new Date(promotedOn).getTime();
    const idx = (doc.promotions || []).findIndex(
      (p) =>
        String(p.rank) === String(rank) &&
        p.promotedOn &&
        new Date(p.promotedOn).getTime() === ts
    );
    if (idx >= 0) {
      doc.promotions.splice(idx, 1);
      removed = true;
    }
  }

  if (!removed) return json({ error: "Promotion not found" }, 404);

  // Recompute derived fields by latest promotion date
  doc.promotions.sort(
    (a, b) => new Date(a.promotedOn) - new Date(b.promotedOn)
  );
  const latest = doc.promotions[doc.promotions.length - 1] || null;
  doc.currentRank = latest?.rank || "";
  doc.lastPromotedOn = latest?.promotedOn || null;

  await doc.save();
  return json({ message: "Promotion deleted", style: doc });
}
