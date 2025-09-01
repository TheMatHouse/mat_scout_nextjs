// app/api/admin/techniques/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Technique from "@/models/techniquesModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getCurrentUserFromCookies();
  if (!user || !user.isAdmin) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

// GET /api/admin/techniques?status=pending|approved|all&q=&page=1&pageSize=20
export async function GET(request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "pending").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "20"))
  );

  const filter = {};
  if (status === "pending") filter.approved = false;
  else if (status === "approved") filter.approved = true;

  if (q) {
    filter.nameLower = { $regex: q.toLowerCase(), $options: "i" };
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    Technique.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Technique.countDocuments(filter),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  });
}

// (Optional) Admin can seed a single technique manually
export async function POST(request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  await connectDB();
  const { name, approved = false } = await request.json();
  const nm = String(name || "").trim();
  if (!nm)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const lower = nm.toLowerCase();
  const existing = await Technique.findOne({ nameLower: lower });
  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      id: existing._id,
      approved: !!existing.approved,
    });
  }

  const doc = await Technique.create({ name: nm, approved: !!approved });
  return NextResponse.json(
    { ok: true, created: true, id: doc._id, approved: !!doc.approved },
    { status: 201 }
  );
}
