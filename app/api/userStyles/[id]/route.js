// app/api/userStyles/[id]/route.js
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

  // Directly owned by the user
  if (String(style.userId) === String(me._id) && !style.familyMemberId) {
    return { style };
  }

  // Or owned via one of their family members
  if (style.familyMemberId) {
    const fam = await FamilyMember.findOne({
      _id: style.familyMemberId,
      userId: me._id,
    }).lean();
    if (fam) return { style };
  }

  return { error: "Forbidden", status: 403 };
}

export async function GET(_request, { params }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const { id } = await params; // Next 15 quirk
  const own = await assertOwnership(me, id);
  if (own.error) return json({ error: own.error }, own.status);

  return json({ style: own.style });
}

export async function PATCH(request, { params }) {
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

  const update = {};
  for (const k of [
    "styleName",
    "rank",
    "division",
    "weightClass",
    "grip",
    "favoriteTechnique",
  ]) {
    if (k in body) update[k] = body[k] || "";
  }

  if ("promotionDate" in body) {
    update.promotionDate = body.promotionDate
      ? new Date(body.promotionDate)
      : undefined;
  }

  const updated = await UserStyle.findByIdAndUpdate(id, update, { new: true });
  return json({ message: "Style updated", updatedStyle: updated });
}

export async function DELETE(_request, { params }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  const own = await assertOwnership(me, id);
  if (own.error) return json({ error: own.error }, own.status);

  await UserStyle.deleteOne({ _id: id });
  return json({ message: "Style deleted" });
}
