"use server";
import { NextResponse } from "next/server";
import Technique from "@/models/techniquesModel";
import { connectDB } from "@/config/mongo";

export const GET = async (request) => {
  try {
    await connectDB();
    const techniques = await Technique.find();

    if (techniques) {
      return new NextResponse(JSON.stringify(techniques));
    } else {
      return new NextResponse("No techniques found");
    }
  } catch (error) {
    return new NextResponse("Error fetching techniques " + error.message, {
      status: 500,
    });
  }
};
