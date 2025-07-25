import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function PATCH(request, context) {
  await connectDB();
  const { userId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    const data = await request.json();

    const allowPublicValue =
      data.allowPublic === "Public" || data.allowPublic === true ? true : false;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        username: data.username,
        city: data.city,
        state: data.state,
        country: data.country,
        gender: data.gender,
        bMonth: data.bMonth,
        bDay: data.bDay,
        bYear: data.bYear,
        allowPublic: allowPublicValue,
        ...(data.password && { password: data.password }),
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "User updated successfully", user: updatedUser },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json(
      { message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
