// app/api/dashboard/[userId]/avatar/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import cloudinary from "@/lib/cloudinary";
import { notifyFollowers } from "@/lib/notify-followers";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/jpeg|image\/png|image\/webp)$/i;

function approxBytesFromDataUrl(dataUrl) {
  const i = dataUrl.indexOf(",");
  if (i === -1) return 0;
  const b64 = dataUrl.slice(i + 1);
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
      user.avatarType = "uploaded";
    } else {
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
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      });

      user.avatarType = "uploaded";
      user.avatar = result.secure_url;
      user.avatarId = result.public_id;
    }

    await user.save();

    const displayUrl = user.avatar?.includes("/upload/")
      ? user.avatar.replace("/upload/", "/upload/f_auto,q_auto/")
      : user.avatar;

    // 🔔 Fan-out AFTER we know the final URL
    try {
      await notifyFollowers(user._id, "followed.avatar.changed", {
        avatarUrl: displayUrl,
      });
    } catch (e) {
      console.warn("[notifyFollowers] avatar fanout failed:", e);
    }

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
