import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    await connectDB();
    const users = await User.find();
    if (users) {
      return new NextResponse(JSON.stringify(users), { status: 200 });
    } else {
      return new NextResponse("No users found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Error fetching users " + error.message, {
      status: 500,
    });
  }
};
