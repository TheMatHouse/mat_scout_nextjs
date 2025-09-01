// app/api/admin/techniques/[id]/route.js
import { NextResponse } from "next/server";
import { Types } from "mongoose";
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

// PATCH /api/admin/techniques/:id  { action: "approve" }
export async function PATCH(request, { params }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  await connectDB();
  const { id } = params || {};
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { action } = await request.json();
  if (action !== "approve") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const updated = await Technique.findByIdAndUpdate(
    id,
    { $set: { approved: true } },
    { new: true }
  ).lean();
  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

// DELETE /api/admin/techniques/:id  (decline = delete)
export async function DELETE(_request, { params }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  await connectDB();
  const { id } = params || {};
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const deleted = await Technique.findByIdAndDelete(id).lean();
  if (!deleted)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
