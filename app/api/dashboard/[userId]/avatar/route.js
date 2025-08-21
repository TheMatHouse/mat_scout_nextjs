// app/api/dashboard/[userId]/avatar/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import cloudinary from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB cap
const ALLOWED_MIME = /^(image\/jpeg|image\/png|image\/webp)$/i;

function approxBytesFromDataUrl(dataUrl) {
  // data:[mime];base64,XXXX
  const i = dataUrl.indexOf(",");
  if (i === -1) return 0;
  const b64 = dataUrl.slice(i + 1);
  // ~ 3/4 of base64 length (minus padding)
  return Math.floor((b64.length * 3) / 4);
}

export const PATCH = async (request, context) => {
  await connectDB();

  const { userId } = context.params || {};
  try {
    const body = await request.json();
    const { image, avatarType } = body || {};

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid or missing user id" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const hadUploaded = user.avatarType === "uploaded" && user.avatarId;

    // Switching back to social avatars: remove old uploaded file
    if ((avatarType === "google" || avatarType === "facebook") && hadUploaded) {
      try {
        await cloudinary.uploader.destroy(user.avatarId);
      } catch (err) {
        console.warn("Cloudinary destroy:", err);
      }
      user.avatarId = undefined;
    }

    if (avatarType === "google") {
      user.avatarType = "google";
      user.avatar = user.googleAvatar || "";
    } else if (avatarType === "facebook") {
      user.avatarType = "facebook";
      user.avatar = user.facebookAvatar || "";
    } else if (avatarType === "uploaded" && image === "use-existing") {
      // re-use previous uploaded avatar
      user.avatarType = "uploaded";
    } else {
      // New custom upload via data URL (base64)
      if (!image || typeof image !== "string" || !image.startsWith("data:")) {
        return NextResponse.json(
          { message: "Image must be a data URL" },
          { status: 400 }
        );
      }

      const mimeMatch = image.match(/^data:([^;]+);base64,/i);
      const mime = mimeMatch?.[1] || "";
      if (!ALLOWED_MIME.test(mime)) {
        return NextResponse.json(
          { message: "Invalid image type (jpeg/png/webp only)" },
          { status: 415 }
        );
      }

      const approxBytes = approxBytesFromDataUrl(image);
      if (approxBytes === 0 || approxBytes > MAX_BYTES) {
        return NextResponse.json(
          { message: "File too large (max 5MB)" },
          { status: 413 }
        );
      }

      // delete prior upload if any
      if (hadUploaded) {
        try {
          await cloudinary.uploader.destroy(user.avatarId);
        } catch (err) {
          console.warn("Cloudinary destroy (old):", err);
        }
      }

      const folder =
        process.env.NODE_ENV === "production"
          ? "prod/avatars"
          : "staging/avatars";
      const result = await cloudinary.uploader.upload(image, {
        folder,
        public_id: `user_${user._id}_${Date.now()}`,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        overwrite: false,
        transformation: [{ width: 300, height: 300, crop: "fill" }], // soft cap for avatar
      });

      user.avatarType = "uploaded";
      user.avatar = result.secure_url; // raw URL
      user.avatarId = result.public_id; // keep for future deletes
    }

    await user.save();

    // Provide a fast-delivery URL using f_auto,q_auto for immediate use in UI
    const displayUrl = user.avatar?.includes("/upload/")
      ? user.avatar.replace("/upload/", "/upload/f_auto,q_auto/")
      : user.avatar;

    return NextResponse.json(
      {
        message: "Avatar updated successfully",
        avatar: user.avatar,
        displayUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating avatar:", error);
    return NextResponse.json(
      { message: "Error updating avatar: " + error.message },
      { status: 500 }
    );
  }
};
