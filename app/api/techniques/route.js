"use server";
import { NextResponse } from "next/server";
import Technique from "@/models/techniquesModel";
import { connectDB } from "@/lib/mongo";

export const GET = async (request) => {
  try {
    await connectDB();
    const techniques = await Technique.find({ approved: true });

    if (techniques.length > 0) {
      return new NextResponse(JSON.stringify(techniques), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new NextResponse(
        JSON.stringify({ message: "No approved techniques found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching techniques",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const body = await request.json();
    const { name } = body;

    const existing = await Technique.findOne({ name });
    if (existing) {
      return new NextResponse("Technique already exists", { status: 200 });
    }

    const newTechnique = new Technique({ name });
    await newTechnique.save();

    return new NextResponse(JSON.stringify(newTechnique), { status: 201 });
  } catch (error) {
    return new NextResponse("Error adding technique: " + error.message, {
      status: 500,
    });
  }
};
