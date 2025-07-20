// app/api/dashboard/[userId]/family/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import FamilyMember from "@/models/familyMemberModel";

// GET all family members for the user
export async function GET(req, context) {
  await connectDB();
  const { userId } = await context.params; // ✅ await

  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const familyMembers = await FamilyMember.find({ userId: currentUser._id });
    return NextResponse.json(familyMembers);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST a new family member
export async function POST(req, context) {
  await connectDB();
  const { userId } = await context.params; // ✅ await

  const currentUser = await getCurrentUserFromCookies();

  console.log("✅ currentUser:", currentUser);
  console.log("✅ currentUser._id:", currentUser?._id?.toString());
  console.log("✅ userId from params:", userId);

  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, username, gender, allowPublic } = body;

    const newFamilyMember = new FamilyMember({
      userId: currentUser._id,
      firstName,
      lastName,
      username,
      gender,
      allowPublic,
    });

    await newFamilyMember.save();

    return NextResponse.json(newFamilyMember, { status: 201 });
  } catch (err) {
    console.error("❌ POST /family error:", err);
    const message =
      err?.message || (typeof err === "string" ? err : "Unknown server error");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
