// app/api/dashboard/[userId]/family/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

// --- helpers ---
function jserr(status, message) {
  return NextResponse.json({ ok: false, message }, { status });
}

// CORS/preflight, and prevents odd 405s in some setups
export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

// GET /api/dashboard/:userId/family  -> list of members with avatar fields
export async function GET(_req, { params }) {
  await connectDB();

  const { userId } = await params;
  if (!isValidId(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Return the fields FamilyCard needs (include avatar fields)
    const members = await FamilyMember.find(
      { userId: currentUser._id },
      {
        firstName: 1,
        lastName: 1,
        username: 1,
        gender: 1,
        avatar: 1,
        avatarId: 1,
        avatarType: 1,
        allowPublic: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    const rows = (members || []).map((m) => ({
      ...m,
      _id: String(m._id),
      userId: String(currentUser._id),
    }));

    return NextResponse.json({ ok: true, rows }, { status: 200 });
  } catch (err) {
    console.error("GET family list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/:userId/family  -> create family member
export async function POST(req, { params }) {
  await connectDB();

  const { userId } = await params;
  if (!isValidId(userId)) return jserr(400, "Invalid userId");

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser) return jserr(401, "Not authenticated");
  if (String(currentUser._id) !== String(userId)) {
    return jserr(403, "Not authorized");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jserr(400, "Invalid JSON body");
  }

  const {
    firstName = "",
    lastName = "",
    username = "",
    gender = "",
    allowPublic = false,
  } = body || {};

  // Basic validation (mirror your form fields)
  if (!String(firstName).trim() || !String(lastName).trim()) {
    return jserr(422, "firstName and lastName are required");
  }
  if (!String(username).trim()) {
    return jserr(422, "username is required");
  }

  // OPTIONAL: enforce username uniqueness among FamilyMembers scoped to this user
  const existing = await FamilyMember.findOne({
    userId: currentUser._id,
    username: String(username).trim(),
  }).lean();
  if (existing) return jserr(409, "Username already exists");

  try {
    const created = await FamilyMember.create({
      userId: currentUser._id,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      username: String(username).trim(),
      gender: String(gender || "").trim(),
      allowPublic: Boolean(allowPublic),
    });

    // Return the shape your UI expects
    const member = {
      _id: String(created._id),
      userId: String(created.userId),
      firstName: created.firstName,
      lastName: created.lastName,
      username: created.username,
      gender: created.gender,
      allowPublic: created.allowPublic,
      avatar: created.avatar || null,
      avatarId: created.avatarId || null,
      avatarType: created.avatarType || null,
      createdAt: created.createdAt,
    };

    return NextResponse.json({ ok: true, member }, { status: 201 });
  } catch (err) {
    console.error("POST family create error:", err);
    return jserr(500, "Internal error creating family member");
  }
}
