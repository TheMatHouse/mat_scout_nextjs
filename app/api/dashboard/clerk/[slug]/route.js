"use server";
import { NextResponse } from "next/server";
import User from "@/models/userModel";
import { Types, ObjectId } from "mongoose";
import { connectDB } from "@/config/mongo";
import { revalidatePath } from "next/cache";

export async function GET(request, { params }) {
  const { slug } = await params;
  console.log(slug);
  const clerkId = slug;
  try {
    await connectDB();

    const data = await User.findOne({
      email: slug,
    });

    if (!data) {
      return new NextResponse(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new NextResponse(JSON.stringify({ data }));
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching user" + error.message }),
      { status: 500 }
    );
  }
}
