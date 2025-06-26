"use server";
import { NextResponse } from "next/server";
import Technique from "@/models/techniquesModel";
import { connectDB } from "@/lib/mongo";

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

export const POST = async (request) => {
  try {
    await connectDB();
    const body = await request.json();
    const { techniqueName } = body;

    // Avoid inserting duplicates
    const existing = await Technique.findOne({ techniqueName });
    if (existing) {
      return new NextResponse("Technique already exists", { status: 200 });
    }

    const newTechnique = new Technique({ techniqueName });
    await newTechnique.save();

    return new NextResponse(JSON.stringify(newTechnique), { status: 201 });
  } catch (error) {
    return new NextResponse("Error adding technique: " + error.message, {
      status: 500,
    });
  }
};
