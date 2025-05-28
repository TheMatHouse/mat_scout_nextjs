// app/api/upload/avatar/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import cloudinary from "@/lib/cloudinary";
import User from "@/models/userModel";

export const PATCH = async (request) => {
  try {
    await connectDB();

    const contentType = request.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      // Social avatar reset
      const body = await request.json();
      const { userId, avatarType } = body;

      if (!userId || !Types.ObjectId.isValid(userId)) {
        return NextResponse.json(
          { message: "Invalid or missing user id" },
          { status: 400 }
        );
      }

      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      user.avatarType = avatarType;
      if (avatarType === "google") {
        user.avatar = user.googleAvatar;
      } else if (avatarType === "facebook") {
        user.avatar = user.facebookAvatar;
      }
      await user.save();
      return NextResponse.json(
        { message: "Avatar reset to social provider" },
        { status: 200 }
      );
    }

    // File upload avatar
    const formData = await request.formData();
    const file = formData.get("image");
    const userId = formData.get("userId");

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user id" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { message: "No image file provided" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Remove old uploaded avatar if exists
    if (user.avatarType === "uploaded" && user.avatar) {
      const publicId = user.avatar.split("avatars/")[1]?.split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      }
    }

    // Upload new avatar
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "avatars",
    });

    user.avatarType = "uploaded";
    user.avatar = result.secure_url;
    await user.save();

    return NextResponse.json(
      { message: "Avatar updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
};
