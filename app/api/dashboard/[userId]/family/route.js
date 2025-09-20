// app/api/dashboard/[userId]/family/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";

// Helpers
function err(status, message) {
  return NextResponse.json({ ok: false, message }, { status });
}
function ok(payload = {}, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status });
}

// GET all family members for the user
export async function GET(_req, ctx) {
  await connectDB();
  const { userId } = await ctx.params; // Next.js 15: await params

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return err(401, "Unauthorized");
  }

  try {
    const rows = await FamilyMember.find(
      { userId: currentUser._id },
      {
        firstName: 1,
        lastName: 1,
        username: 1,
        gender: 1,
        allowPublic: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    return ok({ rows });
  } catch (e) {
    console.error("GET /family error:", e);
    return err(500, "Failed to load family members");
  }
}

// POST a new family member
export async function POST(req, ctx) {
  await connectDB();
  const { userId } = await ctx.params;

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return err(401, "Unauthorized");
  }

  try {
    const body = await req.json();
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const username = (body.username || "").trim().toLowerCase();
    const gender = body.gender || "not specified";
    const allowPublic = !!body.allowPublic;

    if (!firstName || !lastName)
      return err(400, "First and last name are required");
    if (!username) return err(400, "Username is required");

    // Unique username check (collection-wide)
    const exists = await FamilyMember.findOne({ username }).lean();
    if (exists) return err(409, "Username is already taken");

    const doc = await FamilyMember.create({
      userId: currentUser._id,
      firstName,
      lastName,
      username,
      gender,
      allowPublic,
    });

    return ok(
      {
        member: {
          _id: String(doc._id),
          firstName: doc.firstName,
          lastName: doc.lastName,
          username: doc.username,
          gender: doc.gender,
          allowPublic: doc.allowPublic,
        },
      },
      201
    );
  } catch (e) {
    // Handle unique index error gracefully if it slips through
    if (e?.code === 11000 && e?.keyPattern?.username) {
      return err(409, "Username is already taken");
    }
    console.error("POST /family error:", e);
    return err(500, "Failed to create family member");
  }
}
