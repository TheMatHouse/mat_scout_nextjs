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

  // Owned directly
  if (String(style.userId) === String(me._id) && !style.familyMemberId) {
    return { style };
  }
  // Or via one of their family members
  if (style.familyMemberId) {
    const fam = await FamilyMember.findOne({
      _id: style.familyMemberId,
      userId: me._id,
    }).lean();
    if (fam) return { style };
  }
  return { error: "Forbidden", status: 403 };
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const me = await getCurrentUser();
    if (!me) return json({ error: "Unauthorized" }, 401);

    const { id } = await params; // Next 15: await params
    const own = await assertOwnership(me, id);
    if (own.error) return json({ error: own.error }, own.status);

    const doc = await UserStyle.findById(id).lean();
    return json({ style: doc });
  } catch (err) {
    console.error("GET /api/userStyles/[id] error:", err);
    return json({ error: "Failed to load style" }, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const me = await getCurrentUser();
    if (!me) return json({ error: "Unauthorized" }, 401);

    const { id } = await params; // Next 15: await params
    const own = await assertOwnership(me, id);
    if (own.error) return json({ error: own.error }, own.status);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const {
      styleName,
      currentRank,
      startDate, // ISO string or null/undefined
      division,
      weightClass,
      grip,
      favoriteTechnique,
    } = body || {};

    const doc = await UserStyle.findById(id);
    if (!doc) return json({ error: "Style not found" }, 404);

    if (styleName !== undefined) doc.styleName = styleName || "";
    if (currentRank !== undefined) doc.currentRank = currentRank || "";
    if (startDate !== undefined)
      doc.startDate = startDate ? new Date(startDate) : null;
    if (division !== undefined) doc.division = division || "";
    if (weightClass !== undefined) doc.weightClass = weightClass || "";
    if (grip !== undefined) doc.grip = grip || "";
    if (favoriteTechnique !== undefined)
      doc.favoriteTechnique = favoriteTechnique || "";

    // Save through Mongoose so hooks/validation run
    await doc.save();

    return json({ message: "Style updated", style: doc });
  } catch (err) {
    console.error("PATCH /api/userStyles/[id] error:", err);
    // Surface a specific message if available
    return json({ error: err?.message || "Failed to update style" }, 500);
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const me = await getCurrentUser();
    if (!me) return json({ error: "Unauthorized" }, 401);

    const { id } = await params; // Next 15: await params
    const own = await assertOwnership(me, id);
    if (own.error) return json({ error: own.error }, own.status);

    await UserStyle.deleteOne({ _id: id });
    return json({ message: "Style deleted" });
  } catch (err) {
    console.error("DELETE /api/userStyles/[id] error:", err);
    return json({ error: "Failed to delete style" }, 500);
  }
}
