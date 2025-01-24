"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { Style } from "@/models/styleModel";

export const GET = async (request, { params }) => {
  const { userId } = await params;
  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }
    await connectDB();
    const UserStyles = await UserStyle.findOne({ userId });
    if (UserStyles) {
      return new NextResponse(JSON.stringify(UserStyles), { status: 201 });
    } else {
      return new NextResponse("No styles found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Error fetching users " + error.message, {
      status: 500,
    });
  }
};

export const POST = async (request, { params }) => {
  const { userId } = await params;
  console.log("inside POST");
  console.log(userId);
  const body = await request.json();
  const {
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
    console.log("DB connected");
    // Check to see if the user exists
    const userExists = await User.findById(userId);

    if (!userExists) {
      return new NextResponse(
        JSON.stringify({ message: "User not found", status: 404 })
      );
    }

    console.log("user exists");
    // Check to see if the style exists
    const styleExists = await Style.findOne({ styleName });

    if (!styleExists) {
      return new NextResponse(
        JSON.stringify({ message: "Style not found", status: 404 })
      );
    }

    // Check to make sure this user does not already have this style
    const userStyleExists = await UserStyle.findOne({
      userId,
      styleName,
    });
    console.log("line 76");
    if (userStyleExists) {
      return new NextResponse(
        JSON.stringify({
          status: 400,
          message: "You already have this style.",
        })
      );
    }
    console.log("line 85");
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
          status: 201,
          message: "User style created successfully",
          //userStyle: newUserStyle,
        })
      );
    }
  } catch (error) {
    return new NextResponse("Error creating user style " + error.message, {
      status: 500,
    });
  }
};
