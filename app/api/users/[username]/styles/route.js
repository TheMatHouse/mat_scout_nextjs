// app/api/users/[username]/styles/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import mongoose from "mongoose";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(_req, { params }) {
  await connectDB();

  const { username } = await params;
  const target = await User.findOne({ username })
    .select("_id allowPublic username")
    .lean();

  if (!target) return json({ error: "User not found" }, 404);

  const viewer = await getCurrentUser().catch(() => null);
  const isOwner = viewer?._id && String(viewer._id) === String(target._id);
  const isAdmin = !!viewer?.isAdmin;

  if (!(target.allowPublic || isOwner || isAdmin)) {
    return json({ styles: [] }, 403);
  }

  // ✅ Only the user’s own styles (exclude any with familyMemberId set)
  const styles = await UserStyle.find({
    userId: target._id,
    $or: [{ familyMemberId: null }],
  })
    .sort({ createdAt: -1 })
    .lean();

  return json({ styles });
}

export async function POST(req, { params }) {
  await connectDB();

  const { username } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) return json({ error: "Unauthorized" }, 401);

  const target = await User.findOne({ username }).select("_id").lean();
  if (!target) return json({ error: "User not found" }, 404);

  const isOwner = String(viewer._id) === String(target._id);
  const isAdmin = !!viewer.isAdmin;
  if (!isOwner && !isAdmin) return json({ error: "Forbidden" }, 403);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    styleName,
    rank,
    promotionDate,
    weightClass,
    division,
    grip,
    favoriteTechnique,
    familyMemberId,
  } = payload || {};

  if (!styleName || typeof styleName !== "string") {
    return json({ error: "styleName is required" }, 400);
  }

  let fmId = null;
  if (familyMemberId) {
    if (!mongoose.Types.ObjectId.isValid(familyMemberId)) {
      return json({ error: "Invalid familyMemberId" }, 400);
    }
    const fm = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: target._id,
    }).lean();
    if (!fm) return json({ error: "Family member not found" }, 404);
    fmId = fm._id;
  }

  const doc = await UserStyle.create({
    userId: target._id, // derive from :username
    familyMemberId: fmId,
    styleName: styleName.trim(),
    rank: rank || "",
    promotionDate: promotionDate ? new Date(promotionDate) : undefined,
    weightClass: weightClass || "",
    division: division || "",
    grip: grip || "",
    favoriteTechnique: favoriteTechnique || "",
  });

  return json({ style: { id: String(doc._id) } }, 201);
}
