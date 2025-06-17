import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { Types } from "mongoose";

export const GET = async (_req, context) => {
  await connectDB();
  const { userId, memberId } = context.params;
  console.log("userId ", userId);
  console.log("memberId ", memberId);

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const styles = await UserStyle.find({
      userId: new Types.ObjectId(userId),
      familyMemberId: new Types.ObjectId(memberId),
    }).sort({ createdAt: -1 }); // Optional: newest first
    return NextResponse.json(styles, { status: 200 });
  } catch (err) {
    console.error("Error fetching styles:", err);
    return NextResponse.json(
      { message: "Failed to fetch styles" },
      { status: 500 }
    );
  }
};

export const POST = async (req, context) => {
  await connectDB();
  const { userId, memberId } = context.params;

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || currentUser._id.toString() !== userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const newStyle = new UserStyle({
      ...body,
      userId,
      familyMemberId: memberId,
    });

    await newStyle.save();

    const familyMember = await FamilyMember.findById(memberId);
    if (familyMember) {
      if (!Array.isArray(familyMember.userStyles)) {
        familyMember.userStyles = [];
      }
      familyMember.userStyles.push(newStyle._id);
      await familyMember.save();
    }

    return NextResponse.json(
      { message: "Style added", createdStyle: newStyle },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating style:", err);
    return NextResponse.json(
      { message: "Failed to create style" },
      { status: 500 }
    );
  }
};
