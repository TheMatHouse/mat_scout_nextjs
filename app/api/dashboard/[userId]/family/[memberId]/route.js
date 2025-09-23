// app/api/dashboard/[userId]/family/[memberId]/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";
// ✅ Register UserStyle in this module so populate works
import "@/models/userStyleModel";
// (optional) only if you actually delete Cloudinary avatars in DELETE
import { v2 as cloudinary } from "cloudinary";
import { notifyFamilyFollowers } from "@/lib/notify-family-followers";

export const dynamic = "force-dynamic";
const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

// GET
export async function GET(_req, { params }) {
  await connectDB();

  const { userId, memberId } = await params; // ⬅️ await here
  if (!isValidId(userId) || !isValidId(memberId)) {
    return NextResponse.json({ error: "Invalid ID(s)" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const member = await FamilyMember.findOne({
      _id: memberId,
      userId: currentUser._id,
    })
      .populate({ path: "userStyles", model: "UserStyle" })
      .lean();

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...member,
      _id: member._id.toString(),
      userId: member.userId.toString(),
    });
  } catch (err) {
    console.error("GET family member error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family member" },
      { status: 500 }
    );
  }
}

// PATCH
export async function PATCH(req, { params }) {
  await connectDB();

  const { userId, memberId } = await params; // ⬅️ await here
  if (!isValidId(userId) || !isValidId(memberId)) {
    return NextResponse.json({ error: "Invalid ID(s)" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await req.json();

    // Allowed fields (existing) + profile fields (new)
    const allowed = [
      "firstName",
      "lastName",
      "birthDate",
      "avatar",
      "avatarId",
      "notes",
      // profile fields we want to notify on:
      "gender",
      "location",
      "bio",
      "allowPublic",
    ];

    const $set = {};
    for (const k of allowed) {
      if (k in updates) $set[k] = updates[k];
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Track if any profile-notify fields were part of this update
    const profileKeys = ["gender", "location", "bio", "allowPublic"];
    const profileChanged = profileKeys.some((k) => k in $set);

    const member = await FamilyMember.findOneAndUpdate(
      { _id: memberId, userId: currentUser._id },
      { $set },
      { new: true }
    ).lean();

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    // Fan-out only if profile fields were updated
    if (profileChanged) {
      try {
        await notifyFamilyFollowers({
          familyId: memberId, // helper can resolve ObjectId string
          type: "family_profile_updated",
          actorUserId: currentUser._id,
        });
      } catch (fanoutErr) {
        console.warn("[notifyFamilyFollowers profile] failed:", fanoutErr);
        // don't fail the request on notification issues
      }
    }

    return NextResponse.json({
      ...member,
      _id: member._id.toString(),
      userId: member.userId.toString(),
    });
  } catch (err) {
    console.error("PATCH family member error:", err);
    return NextResponse.json(
      { error: "Failed to update family member" },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(_req, { params }) {
  await connectDB();

  const { userId, memberId } = await params; // ⬅️ await here
  if (!isValidId(userId) || !isValidId(memberId)) {
    return NextResponse.json({ error: "Invalid ID(s)" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const member = await FamilyMember.findOne({
      _id: memberId,
      userId: currentUser._id,
    });
    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    if (member.avatarId) {
      try {
        await cloudinary.uploader.destroy(member.avatarId);
      } catch (e) {
        console.warn("Cloudinary delete failed:", e?.message || e);
      }
    }

    await FamilyMember.deleteOne({ _id: member._id });
    return NextResponse.json({ message: "Family member deleted successfully" });
  } catch (err) {
    console.error("DELETE family member error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
