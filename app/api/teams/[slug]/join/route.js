// File: app/api/teams/[slug]/join/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
//import { getCurrentUser } from "@/lib/getCurrentUser";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function POST(req, context) {
  await connectDB();

  const { slug } = await context.params;

  // Authenticate user
  let user;
  try {
    //user = await getCurrentUser();
    user = await getCurrentUser();
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the team
  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Parse body for optional familyMemberId
  let familyMemberId = null;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text);
      familyMemberId = body?.familyMemberId || null;
    }
  } catch (err) {
    console.warn("Join body parsing failed:", err);
  }

  // Check for existing membership
  if (familyMemberId) {
    // Confirm the family member exists and belongs to user
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: user._id,
    });
    if (!familyMember) {
      return NextResponse.json(
        { error: "Invalid family member" },
        { status: 400 }
      );
    }

    const existing = await TeamMember.findOne({
      teamId: team._id,
      familyMemberId,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already requested or a member (family)" },
        { status: 400 }
      );
    }
  } else {
    const existing = await TeamMember.findOne({
      teamId: team._id,
      userId: user._id,
      familyMemberId: { $exists: false },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already requested or a member (user)" },
        { status: 400 }
      );
    }
  }

  // Create membership
  try {
    const newMember = await TeamMember.create({
      teamId: team._id,
      userId: user._id,
      role: "pending",
      ...(familyMemberId && { familyMemberId }),
    });

    return NextResponse.json({ message: "Request submitted" }, { status: 200 });
  } catch (err) {
    console.error("Join error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
