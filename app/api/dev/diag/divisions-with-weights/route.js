export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import division from "@/models/divisionModel";

export async function GET() {
  await connectDB();
  const rows = await division
    .find({})
    .populate({
      path: "weightCategory",
      model: "weightCategory",
      select: "name unit items",
    })
    .populate({ path: "style", select: "styleName" })
    .lean();

  const out = rows.map((d) => ({
    divisionId: String(d._id),
    styleName: d.style?.styleName || null,
    name: d.name,
    gender: d.gender,
    weightCategoryId: d.weightCategory?._id
      ? String(d.weightCategory._id)
      : null,
    weightCategoryName: d.weightCategory?.name || null,
    unit: d.weightCategory?.unit || null,
    itemsCount: Array.isArray(d.weightCategory?.items)
      ? d.weightCategory.items.length
      : 0,
  }));

  return NextResponse.json({ ok: true, count: out.length, rows: out });
}
