"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import UserStyle from "@/models/userStyleModel";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Style from "@/models/styleModel";

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
  const { userId, styleId } = body;

  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

    if (!styleId || !Types.ObjectId.isValid(styleId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing style id" })
      );
    }

    await connectDB();
    const userExists = await User.findById(userId);

    if (!userExists) {
      return new NextResponse(JSON.stringify({ message: "User nout found" }));
    }

    const styleExists = await Style.findById(styleId);

    if (!styleExists) {
      return new NextResponse(JSON.stringify({ message: "Style nout found" }));
    }
  } catch (error) {}
  return new NextResponse(JSON.stringify("Connected"), { status: 200 });
  //   const newStyle = new User(body);
  //   await newStyle.save();
};
