import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { Types } from "mongoose";

export const PATCH = async (req, context) => {
  await connectDB();
  const { userId, memberId, styleId } = await context.params;

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await req.json();

    const updated = await UserStyle.findOneAndUpdate(
      { _id: styleId, userId, familyMemberId: memberId },
      updates,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Style not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Style updated successfully",
        updatedStyle: updated, // 👈 consistent key used in onSuccess
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating style:", err);
    return NextResponse.json(
      { message: "Failed to update style", error: err.message },
      { status: 500 }
    );
  }
};

export const DELETE = async (_req, context) => {
  await connectDB();
  const { userId, memberId, styleId } = await context.params;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid userId" }, { status: 400 });
  }

  if (!memberId || !Types.ObjectId.isValid(memberId)) {
    return NextResponse.json(
      { message: "Invalid family member ID" },
      { status: 400 }
    );
  }

  if (!styleId || !Types.ObjectId.isValid(styleId)) {
    return NextResponse.json({ message: "Invalid style ID" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    // Ensure the style exists and belongs to this family member
    const style = await UserStyle.findOne({
      _id: styleId,
      familyMemberId: memberId,
    });

    if (!style) {
      return NextResponse.json({ message: "Style not found" }, { status: 404 });
    }

    await UserStyle.findByIdAndDelete(styleId);

    // Remove from family member's styles array
    await FamilyMember.findByIdAndUpdate(memberId, {
      $pull: { userStyles: styleId },
    });

    return NextResponse.json(
      { message: "Style deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to delete style: " + err.message },
      { status: 500 }
    );
  }
};
