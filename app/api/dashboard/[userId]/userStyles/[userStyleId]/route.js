import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

export const PATCH = async (request, context) => {
  try {
    await connectDB();
    const { userId, userStyleId } = await context.params;

    const body = await request.json();
    const {
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
    } = body;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" }),
        { status: 400 }
      );
    }

    if (!userStyleId || !Types.ObjectId.isValid(userStyleId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user style id" }),
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const userStyle = await UserStyle.findOne({ _id: userStyleId, userId });
    if (!userStyle) {
      return new NextResponse(
        JSON.stringify({ message: "User style not found" }),
        { status: 404 }
      );
    }

    userStyle.rank = rank || userStyle.rank;
    userStyle.promotionDate = promotionDate
      ? new Date(promotionDate)
      : userStyle.promotionDate;
    userStyle.division = division || userStyle.division;
    userStyle.weightClass = weightClass || userStyle.weightClass;
    userStyle.grip = grip || userStyle.grip;
    userStyle.favoriteTechnique =
      favoriteTechnique || userStyle.favoriteTechnique;

    const updatedUserStyle = await userStyle.save();

    return new NextResponse(
      JSON.stringify({
        message: "Style updated successfully",
        updatedStyle: updatedUserStyle,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error updating style: " + error.message }),
      { status: 500 }
    );
  }
};

export const DELETE = async (request, context) => {
  try {
    await connectDB();
    const { userId, userStyleId } = await context.params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" }),
        { status: 400 }
      );
    }

    if (!userStyleId || !Types.ObjectId.isValid(userStyleId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user style id" }),
        { status: 400 }
      );
    }

    const { getCurrentUser } = await import("@/lib/auth-server.js");
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser._id.toString() !== userId) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized to delete this style" }),
        { status: 403 }
      );
    }

    const userStyle = await UserStyle.findOne({ _id: userStyleId, userId });

    if (!userStyle) {
      return new NextResponse(JSON.stringify({ message: "Style not found" }), {
        status: 404,
      });
    }

    // ❌ Delete the style
    await UserStyle.findByIdAndDelete(userStyleId);

    // 🔁 Remove reference from user.userStyles
    await User.findByIdAndUpdate(userId, {
      $pull: { userStyles: userStyleId },
    });

    return new NextResponse(
      JSON.stringify({ message: "User style deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error deleting user style " + error.message }),
      { status: 500 }
    );
  }
};
