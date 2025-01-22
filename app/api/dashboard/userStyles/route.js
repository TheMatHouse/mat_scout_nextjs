"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { Style } from "@/models/styleModel";

export const GET = async (request) => {
  try {
    await connectDB();
    const UserStyles = await UserStyle.find();
    if (UserStyles) {
      return new NextResponse(JSON.stringify(UserStyles), { status: 200 });
    } else {
      return new NextResponse("No styles found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Error fetching users " + error.message, {
      status: 500,
    });
  }
};

export const POST = async (request) => {
  const body = await request.json();
  const {
    userId,
    styleName,
    rank,
    promotionDate,
    division,
    weightClass,
    grip,
    favoriteTechnique,
  } = body;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    await connectDB();

    // Check to see if the user exists
    const userExists = await User.findById(userId);

    if (!userExists) {
      return new NextResponse(JSON.stringify({ message: "User nout found" }));
    }

    // Check to see if the style exists
    const styleExists = await Style.findOne({ styleName });

    if (!styleExists) {
      return new NextResponse(JSON.stringify({ message: "Style not found" }));
    }

    // Check to make sure this user does not already have this style
    const userStyleExists = await UserStyle.findOne({
      userId,
      styleName,
    });

    if (userStyleExists) {
      return new NextResponse(
        JSON.stringify({ message: "You already have this style." })
      );
    }

    const newUserStyle = await UserStyle.create({
      styleName: styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
      userId,
    });

    if (newUserStyle) {
      return new NextResponse(
        JSON.stringify({
          message: "User style created successfully",
          userStyle: newUserStyle,
        }),
        { status: 201 }
      );
    }
  } catch (error) {
    return new NextResponse("Error creating user style " + error.message, {
      status: 500,
    });
  }
};
