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

  const styles = await UserStyle.find(query).lean();
  return json({ styles });
}

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
    rank,
    division,
    weightClass,
    grip,
    favoriteTechnique,
    promotionDate,
    familyMemberId, // optional
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

  const created = await UserStyle.create({
    styleName,
    rank: rank || "",
    division: division || "",
    weightClass: weightClass || "",
    grip: grip || "",
    favoriteTechnique: favoriteTechnique || "",
    promotionDate: promotionDate ? new Date(promotionDate) : undefined,
    userId: me._id,
    familyMemberId: familyMemberId || null,
  });

  return json({ message: "Style saved", createdStyle: created });
}
