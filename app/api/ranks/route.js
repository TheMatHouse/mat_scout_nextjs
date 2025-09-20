// app/api/ranks/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Rank from "@/models/rankModel"; // your rankModel.js

export const dynamic = "force-dynamic";

export async function GET(request) {
  await connectDB();

  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style"); // e.g. "Judo", "Brazilian Jiu-Jitsu", "Wrestling"

  const q = {};
  if (style && style !== "Wrestling") {
    q.style = style;
  }
  // For Wrestling you probably want no belt ranks; return empty list.

  try {
    const ranks = await Rank.find(q).sort({ order: 1 }).lean();
    return NextResponse.json(ranks ?? [], { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { message: "Failed to load ranks" },
      { status: 500 }
    );
  }
}
