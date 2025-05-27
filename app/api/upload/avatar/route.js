// /app/api/upload/avatar/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import cloudinary from "@/lib/cloudinary";

export const PATCH = async (request) => {
  try {
    const body = await request.json();
    const { userId, image, avatarType } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user ID" }),
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    // Delete old avatar if it's uploaded or Facebook
    if (user.avatarType === "uploaded" || user.avatarType === "facebook") {
      const currentAvatar = user.avatar;
      const parts = currentAvatar.split("avatars/");
      if (parts.length > 1) {
        const publicId = parts[1].split(".")[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      }
    }

    // Handle avatar update
    if (avatarType === "google") {
      user.avatarType = "google";
      user.avatar = "";
    } else if (avatarType === "default") {
      user.avatarType = "default";
      user.avatar =
        process.env.DEFAULT_AVATAR_URL ||
        "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";
    } else {
      const result = await cloudinary.uploader.upload(image, {
        folder: "avatars",
      });
      user.avatarType = "uploaded";
      user.avatar = result.secure_url;
    }

    await user.save();
    return new NextResponse(
      JSON.stringify({
        message: "Avatar updated successfully",
        avatar: user.avatar,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Avatar upload error:", error);
    return new NextResponse(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
};
