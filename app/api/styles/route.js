// app/api/styles/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Style from "@/models/styleModel";

export async function GET() {
  try {
    await connectDB();

    // Fetch all style docs (only need styleName), then clean & dedupe
    const docs = await Style.find({}, { styleName: 1 }).lean();

    // Deduplicate by trimmed, case-insensitive name; keep first _id seen
    const byName = new Map();
    for (const d of docs) {
      const raw = (d?.styleName ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { _id: d._id?.toString?.(), styleName: raw });
      }
    }

    const styles = Array.from(byName.values()).sort((a, b) =>
      a.styleName.localeCompare(b.styleName, undefined, { sensitivity: "base" })
    );

    // Return array of objects to match existing Form expectations
    return NextResponse.json(styles, { status: 200 });
  } catch (error) {
    console.error("GET /api/styles error:", error);
    return NextResponse.json(
      { message: "Error fetching styles", detail: error.message },
      { status: 500 }
    );
  }
}
