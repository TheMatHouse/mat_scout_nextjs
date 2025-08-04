import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import FamilyMember from "@/models/familyMemberModel";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { Types } from "mongoose";

export const PATCH = async (req, context) => {
  await connectDB();

  const { userId, memberId } = await context.params;

  try {
    const currentUser = await getCurrentUserFromCookies();

    if (!currentUser || currentUser._id.toString() !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (
      !userId ||
      !memberId ||
      !Types.ObjectId.isValid(userId) ||
      !Types.ObjectId.isValid(memberId)
    ) {
      return NextResponse.json({ message: "Invalid ID(s)" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { message: "No image provided" },
        { status: 400 }
      );
    }

    const member = await FamilyMember.findOne({ userId, _id: memberId });

    if (!member) {
      return NextResponse.json(
        { message: "Family member not found" },
        { status: 404 }
      );
    }

    // Remove previous avatar if it exists and is not default
    if (member.avatarType === "uploaded" && member.avatarId) {
      await cloudinary.uploader.destroy(member.avatarId, { invalidate: true });
    }

    const buffer = await file.arrayBuffer();
    const mime = file.type;
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    const timestamp = Date.now();
    const public_id = `family_${member._id}_${timestamp}`;

    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: "avatars",
      public_id,
    });

    member.avatar = `${uploadRes.secure_url}?v=${timestamp}`;
    member.avatarId = uploadRes.public_id;
    member.avatarType = "uploaded";
    await member.save();

    return NextResponse.json(
      { message: "Avatar updated successfully", avatar: member.avatar },
      { status: 200 }
    );
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json(
      { message: "Upload failed: " + err.message },
      { status: 500 }
    );
  }
};
