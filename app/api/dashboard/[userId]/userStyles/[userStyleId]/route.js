"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { UserStyle } from "@/models/userStyleModel";
import { connectDB } from "@/config/mongo";
import { User } from "@/models/userModel";

export const PATCH = async (request, { params }) => {
  try {
    const { userId, userStyleId } = await params;

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
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    if (!userStyleId || !Types.ObjectId.isValid(userStyleId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user style id" })
      );
    }

    await connectDB();

    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(
        JSON.stringify({
          message: "User not found",
        }),
        { status: 404 }
      );
    }
    const userStyle = await UserStyle.findOne({ _id: userStyleId, userId });

    if (!userStyle) {
      return new NextResponse(
        JSON.stringify(({ message: "User style not found" }, { status: 404 }))
      );
    }

    if (userStyle) {
      userStyle.rank = rank || userStyle.rank;
      userStyle.promotionDate = promotionDate || userStyle.promotionDate;
      userStyle.division = division || userStyle.division;
      (userStyle.weightClass = weightClass || userStyle.weightClass),
        (userStyle.grip = grip || userStyle.grip);
      userStyle.favoriteTechnique =
        favoriteTechnique || userStyle.favoriteTechnique;

      const updatedUserStyle = await userStyle.save();

      if (updatedUserStyle) {
        return new NextResponse(
          JSON.stringify({ message: "Style updated successfully" }),
          {
            status: 200,
          }
        );
      }
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error updating style " + error.message }),
      { status: 500 }
    );
  }
};

export const DELETE = async (request, { params }) => {
  try {
    const { userId, userStyleId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    if (!userStyleId || !Types.ObjectId.isValid(userStyleId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user style id" })
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const userStyle = await UserStyle.findOne({ _id: userStyleId, userId });

    if (!userStyle) {
      return new NextResponse(
        JSON.stringify({
          message: "Style not found",
        }),
        { status: 404 }
      );
    }

    await UserStyle.findByIdAndDelete(userStyleId);

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
