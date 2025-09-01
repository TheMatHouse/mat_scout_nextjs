// app/api/techniques/route.js
import { NextResponse } from "next/server";
import Technique from "@/models/techniquesModel";
import { connectDB } from "@/lib/mongo";

export const dynamic = "force-dynamic"; // avoid caching while iterating

export async function GET() {
  try {
    await connectDB();
    // If you really need the approved gate, keep { approved: true }
    // Otherwise use {} to return all techniques:
    const docs = await Technique.find({ approved: true }, { name: 1 }).lean();

    // IMPORTANT: Always return an array (even empty), never a message object
    return NextResponse.json(Array.isArray(docs) ? docs : []);
  } catch (error) {
    console.error("[GET /api/techniques] error:", error);
    return NextResponse.json(
      { error: "Error fetching techniques" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { name } = await request.json();

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await Technique.findOne({ name: name.trim() });
    if (existing) {
      // keep 200 if you rely on it; 409 is more standard:
      return NextResponse.json(
        { ok: true, message: "Technique already exists" },
        { status: 200 }
      );
    }

    const newTechnique = await Technique.create({
      name: name.trim(),
      approved: true,
    });
    return NextResponse.json(newTechnique, { status: 201 });
  } catch (error) {
    console.error("[POST /api/techniques] error:", error);
    return NextResponse.json(
      { error: "Error adding technique", detail: error.message },
      { status: 500 }
    );
  }
}
