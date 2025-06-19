// app/api/dashboard/[userId]/family/[memberId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth";
import FamilyMember from "@/models/familyMemberModel";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req, context) {
  await connectDB();

  const { userId, memberId } = context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (
    !currentUser ||
    currentUser._id.toString() !== userId ||
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId)
  ) {
    return NextResponse.json(
      { error: "Unauthorized or invalid ID" },
      { status: 401 }
    );
  }

  try {
    const member = await FamilyMember.findOne({
      _id: memberId,
      userId: currentUser._id,
    })
      .populate("userStyles")
      .lean();

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (err) {
    console.error("GET family member error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family member" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, context) {
  await connectDB();

  const { userId, memberId } = context.params;
  const currentUser = await getCurrentUserFromCookies();

  if (
    !currentUser ||
    currentUser._id.toString() !== userId ||
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(memberId)
  ) {
    return NextResponse.json(
      { error: "Unauthorized or invalid ID" },
      { status: 401 }
    );
  }

  try {
    const updates = await req.json();

    const member = await FamilyMember.findOneAndUpdate(
      {
        userId: currentUser._id,
        _id: memberId,
      },
      updates,
      { new: true }
    );

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const { userId, memberId } = await context.params;
  await connectDB();

  const currentUser = await getCurrentUserFromCookies();

  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    // 🧹 Delete avatar from Cloudinary if it's a custom upload
    if (member.avatarId) {
      try {
        await cloudinary.uploader.destroy(member.avatarId);
        console.log(`Deleted Cloudinary image: ${member.avatarId}`);
      } catch (cloudErr) {
        console.warn("Cloudinary delete failed:", cloudErr);
      }
    }

    await FamilyMember.findByIdAndDelete(memberId);

    return NextResponse.json({ message: "Family member deleted successfully" });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
