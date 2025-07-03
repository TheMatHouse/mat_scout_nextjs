// app/api/family/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth";

export async function GET() {
  await connectDB();
  const user = await getCurrentUserFromCookies();
  if (!user) return NextResponse.json({ familyMembers: [] });
  const familyMembers = await FamilyMember.find({ userId: user._id }).lean();
  return NextResponse.json({ familyMembers });
}
