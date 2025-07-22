import { NextResponse } from "next/server";
import { Types } from "mongoose";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import cloudinary from "@/lib/cloudinary";

export const PATCH = async (request, context) => {
  await connectDB();

  const { userId } = await context.params;

  try {
    const body = await request.json();
    const { image, avatarType } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" }),
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const shouldDeleteUploaded =
      user.avatarType === "uploaded" && user.avatarId;

    // 🔄 Switch to Google or Facebook
    if (
      (avatarType === "google" || avatarType === "facebook") &&
      shouldDeleteUploaded
    ) {
      try {
        await cloudinary.uploader.destroy(user.avatarId);
        user.avatarId = undefined;
      } catch (err) {
        console.warn("Error deleting Cloudinary avatar:", err);
      }
    }

    if (avatarType === "google") {
      user.avatarType = "google";
      user.avatar = user.googleAvatar || "";
    } else if (avatarType === "facebook") {
      user.avatarType = "facebook";
      user.avatar = user.facebookAvatar || "";
    } else if (avatarType === "uploaded" && image === "use-existing") {
      // ✅ Revert to previously uploaded avatar
      user.avatarType = "uploaded";
    } else {
      // ✅ Uploading a new custom avatar
      if (shouldDeleteUploaded) {
        try {
          await cloudinary.uploader.destroy(user.avatarId);
        } catch (err) {
          console.warn("Error deleting old uploaded avatar:", err);
        }
      }

      const result = await cloudinary.uploader.upload(image, {
        folder: "avatars",
        public_id: `user_${user._id}_${Date.now()}`,
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      });

      user.avatarType = "uploaded";
      user.avatar = result.secure_url;
      user.avatarId = result.public_id;
    }

    await user.save();

    return new NextResponse(
      JSON.stringify({ message: "Avatar updated successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating avatar:", error);
    return new NextResponse(
      JSON.stringify({ message: "Error updating avatar: " + error.message }),
      { status: 500 }
    );
  }
};
