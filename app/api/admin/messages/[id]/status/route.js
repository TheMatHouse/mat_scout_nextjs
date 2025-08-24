// app/api/admin/messages/[id]/status/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import ContactThread from "@/models/contactThreadModel";
import { getCurrentUser } from "@/lib/auth-server";

function ok(json, status = 200) {
  return NextResponse.json(json, { status });
}

export async function PATCH(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) return ok({ error: "Unauthorized" }, 401);

    await connectDB();

    const p = await params; // ✅
    const id = p?.id;

    const { status } = await req.json();
    if (!["open", "closed"].includes(status)) {
      return ok({ error: "Invalid status" }, 400);
    }

    const t = await ContactThread.findById(id);
    if (!t) return ok({ error: "Not found" }, 404);

    t.status = status;
    await t.save();

    return ok({ ok: true });
  } catch (err) {
    console.error("PATCH status error:", err);
    return ok({ error: "Server error" }, 500);
  }
}
