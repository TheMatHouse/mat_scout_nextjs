import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Faq from "@/models/Faq";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const includeUnpublished = searchParams.get("all") === "1";

  let filter = {};
  if (!includeUnpublished) filter.isPublished = true;

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ question: regex }, { answer: regex }, { tags: regex }];
  }

  const faqs = await Faq.find(filter).sort({ order: 1, updatedAt: -1 }).lean();
  return NextResponse.json({ faqs });
}

export async function POST(req) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const doc = await Faq.create({
    question: body.question?.trim(),
    answer: body.answer ?? "",
    tags: (body.tags || []).map((t) => String(t).trim()).filter(Boolean),
    isPublished: Boolean(body.isPublished),
    order: Number.isFinite(body.order) ? Number(body.order) : 0,
  });

  return NextResponse.json({ faq: doc }, { status: 201 });
}
