// app/api/dashboard/[userId]/family/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import FamilyMember from "@/models/familyMemberModel";

// GET all family members for the user
export async function GET(req, context) {
  await connectDB();
  const params = await context.params; // ✅ await it!

  const currentUser = await getCurrentUserFromCookies();

  if (
    !currentUser ||
    currentUser._id.toString() !== (await context.params.userId)
  ) {
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
  const params = await context.params;

  const currentUser = await getCurrentUserFromCookies();

  if (
    !currentUser ||
    currentUser._id.toString() !== (await context.params.userId)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Destructure only allowed fields from the body
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
    return NextResponse.json(
      { error: err.message || "Failed to add family member" },
      { status: 500 }
    );
  }
}
