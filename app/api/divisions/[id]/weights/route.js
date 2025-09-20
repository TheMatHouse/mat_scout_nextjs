// app/api/divisions/[id]/weights/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

// ✅ your current model filenames
import division from "@/models/divisionModel";
import weightCategory from "@/models/weightCategoryModel";

export async function GET(req, ctx) {
  try {
    // ⬇️ Next.js 15+ requires awaiting params for dynamic API routes
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "Missing division id" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the division to get its linked weightCategory
    const div = await division
      .findById(id, { name: 1, gender: 1, weightCategory: 1 })
      .lean();

    if (!div) {
      return NextResponse.json(
        { ok: false, message: "Division not found" },
        { status: 404 }
      );
    }

    // Division has no weights configured
    if (!div.weightCategory) {
      return NextResponse.json(
        {
          ok: true,
          division: {
            _id: String(div._id),
            name: div.name,
            gender: div.gender ?? null,
          },
          weightCategory: null,
        },
        { status: 200 }
      );
    }

    // Load the category + its items for the dropdown
    const cat = await weightCategory
      .findById(div.weightCategory, { unit: 1, items: 1 })
      .lean();

    if (!cat) {
      return NextResponse.json(
        {
          ok: true,
          division: {
            _id: String(div._id),
            name: div.name,
            gender: div.gender ?? null,
          },
          weightCategory: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        division: {
          _id: String(div._id),
          name: div.name,
          gender: div.gender ?? null,
        },
        weightCategory: {
          _id: String(cat._id),
          unit: cat.unit,
          items: (cat.items || []).map((it) => ({
            _id: String(it._id),
            label: it.label,
            min: it.min ?? null,
            max: it.max ?? null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/divisions/[id]/weights error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load weights" },
      { status: 500 }
    );
  }
}
