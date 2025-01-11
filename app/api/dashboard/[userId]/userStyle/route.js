"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/config/mongo";
import { UserStyle } from "@/models/userStyleModel";
import { User } from "@/models/userModel";

export async function POST(request, { params }) {
  try {
    const { userId } = await params;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing user id" })
      );
    }

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

    await connectDB();

    const userExists = await User.findById(userId);
    if (!userExists) {
      return new NextResponse(
        JSON.stringify(({ message: "User not found" }, { status: 404 }))
      );
    }
    const userStyleExists = await UserStyle.findOne({
      styleName,
      userId,
    });

    if (userStyleExists) {
      return new NextResponse(
        JSON.stringify(
          ({ message: "You already have this style" }, { status: 400 })
        )
      );
    }

    const newUserStyle = await UserStyle.create({
      styleName,
      rank,
      promotionDate,
      division,
      weightClass,
      grip,
      favoriteTechnique,
      userId,
    });

    return new NextResponse(
      JSON.stringify({
        message: "Your style/sport has been added successfully",
        status: 201,
      })
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error adding user style" + error.message }),
      { status: 500 }
    );
  }
}
