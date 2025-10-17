import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Faq from "@/models/Faq";
import { getCurrentUser } from "@/lib/auth-server";

export async function PUT(_req, { params }) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await _req.json();

  const update = {
    ...(body.question != null ? { question: body.question.trim() } : {}),
    ...(body.answer != null ? { answer: body.answer } : {}),
    ...(body.tags != null
      ? { tags: body.tags.map((t) => String(t).trim()).filter(Boolean) }
      : {}),
    ...(body.isPublished != null ? { isPublished: !!body.isPublished } : {}),
    ...(body.order != null ? { order: Number(body.order) || 0 } : {}),
  };

  const doc = await Faq.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ faq: doc });
}

export async function DELETE(_req, { params }) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await Faq.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
