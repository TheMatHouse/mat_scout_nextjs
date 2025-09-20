// app/api/divisions/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import styleModel from "@/models/styleModel";
import division from "@/models/divisionModel"; // your model file

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
const genderLabel = (g) =>
  g === "male" ? "Men" : g === "female" ? "Women" : "Coed";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const styleId = searchParams.get("styleId");
    const styleNameRaw = searchParams.get("styleName");

    let filter;

    if (styleId) {
      filter = { style: styleId };
    } else if (styleNameRaw) {
      const target = norm(styleNameRaw);
      const strictRx = new RegExp(`^\\s*${styleNameRaw}\\s*$`, "i");

      // Try exact name first
      let styles = await styleModel
        .find({ styleName: strictRx })
        .select("_id styleName")
        .lean();

      // Fallback to normalized match
      if (!styles.length) {
        const all = await styleModel.find({}).select("_id styleName").lean();
        styles = all.filter((s) => norm(s.styleName) === target);
      }

      // BJJ aliases fallback
      if (!styles.length && /bjj|brazilian/.test(target)) {
        const bjjRx = /bjj|brazilian\s*jiu\s*[-\s]*jitsu/i;
        styles = await styleModel
          .find({ styleName: bjjRx })
          .select("_id styleName")
          .lean();
      }

      if (!styles.length) {
        return NextResponse.json({ ok: true, divisions: [] }, { status: 200 });
      }

      filter = { style: { $in: styles.map((s) => s._id) } };
    } else {
      return NextResponse.json(
        { ok: false, error: "Missing styleId or styleName" },
        { status: 400 }
      );
    }

    const docs = await division
      .find(filter)
      .select("name gender")
      .sort({ name: 1 })
      .lean();

    const out = docs.map((d) => ({
      _id: d._id,
      name: d.name,
      gender: d.gender ?? null,
      label: d.gender ? `${d.name} — ${genderLabel(d.gender)}` : d.name,
    }));

    return NextResponse.json({ ok: true, divisions: out }, { status: 200 });
  } catch (err) {
    console.error("GET /api/divisions error:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
