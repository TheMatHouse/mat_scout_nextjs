// app/api/styles/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Style from "@/models/styleModel"; // ✅ your file name

export async function GET() {
  try {
    await connectDB();

    // Return distinct, cleaned, sorted style names (array of strings)
    const names = await Style.distinct("styleName");
    const sorted = names
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    return NextResponse.json(sorted, { status: 200 });
  } catch (error) {
    console.error("GET /api/styles error:", error);
    return NextResponse.json(
      { message: "Error fetching styles", detail: error.message },
      { status: 500 }
    );
  }
}
