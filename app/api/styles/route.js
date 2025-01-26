"use server";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import Style from "@/models/styleModel";
import { connectDB } from "@/config/mongo";

export const GET = async (request) => {
  try {
    await connectDB();
    const styles = await Style.find();
    if (styles) {
      return new NextResponse(JSON.stringify(styles), { status: 200 });
    } else {
      return new NextResponse("No styles found", { status: 404 });
    }
  } catch (error) {
    return new NextResponse("Error fetching styles " + error.message, {
      status: 500,
    });
  }
};
