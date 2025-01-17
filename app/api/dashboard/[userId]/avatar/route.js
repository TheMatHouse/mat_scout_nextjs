"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { User } from "@/models/userModel";
import { connectDB } from "@/config/mongo";
import cloudinary from "@/config/cloudinary";

export const PATCH = async (request, { params }) => {
  try {
    const { userId } = await params;

    const body = await request.json();
    const { image, avatarType } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }
    await connectDB();
    const user = await User.findById(userId);
    if (user) {
      if (user.avatarType !== "default" && user.avatarType !== "google") {
        const currentAvatar = user.avatar;
        const fileName = currentAvatar.split("avatars/");
        const public_id = fileName[1].split(".");
        await cloudinary.uploader.destroy(
          `avatars/${public_id[0]}`,
          function (result) {
            console.log(result);
          }
        );
      }

      if (avatarType === "google") {
        console.log("avatar type does equal google");
        user.avatarType = "google";
        user.avatar = "";
      } else {
        if (user.avatar) {
          const currentAvatar = user.avatar;
          const fileName = currentAvatar.split("avatars/");
          const public_id = fileName[1].split(".");
          await cloudinary.uploader.destroy(
            `avatars/${public_id[0]}`,
            function (result) {
              console.log(result);
            }
          );
        }
        const result = await cloudinary.uploader.upload(image, {
          folder: "avatars",
          // width: 300,
          // crop: "scale"
        });

        user.avatarType = "uploaded";
        user.avatar = result.secure_url;
      }
      await user.save();
      return new NextResponse(
        JSON.stringify({ message: "Avatar updated successfully" }),
        {
          status: 200,
        }
      );
    } else {
      return new NextResponse(
        JSON.stringify(({ message: "User not found" }, { status: 404 }))
      );
    }
    //   if (user) {
    //     user.avatarType = avatarType;
    //     if (avatarType === "google") {
    //       user.avatarType = "google";
    //       user.avatar = "";
    //     } else {
    //       user.avatarType = "uploaded";
    //       user.avatar = avatarURL;
    //     }
    //     const updatedUser = await user.save();
    //     return new NextResponse(
    //       JSON.stringify({ message: "Avatar updated successfully" }),
    //       {
    //         status: 200,
    //       }
    //     );
    //   } else {
    //     return new NextResponse(
    //       JSON.stringify(({ message: "User not found" }, { status: 404 }))
    //     );
    //   }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
};
