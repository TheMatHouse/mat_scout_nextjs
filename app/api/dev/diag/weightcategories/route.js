export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import weightCategory from "@/models/weightCategoryModel";

export async function GET() {
  await connectDB();
  const cats = await weightCategory
    .find({})
    .select("name unit gender items")
    .lean();
  const out = cats.map((c) => ({
    id: String(c._id),
    name: c.name,
    unit: c.unit,
    gender: c.gender,
    itemsCount: Array.isArray(c.items) ? c.items.length : 0,
    sample: (c.items || []).slice(0, 4).map((i) => i.label),
  }));
  return NextResponse.json({ ok: true, count: out.length, categories: out });
}
