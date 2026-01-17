export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import PrivateShare from "@/models/privateShareModel";
import PendingPrivateShareInvite from "@/models/pendingPrivateShareInviteModel";

const sid = (v) => (v == null ? "" : String(v).trim());

function json(status, payload) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function DELETE(_req, ctx) {
  try {
    const p = await ctx.params;
    const ownerId = sid(p?.userId);
    const shareId = sid(p?.shareId);

    if (!ownerId || !shareId) {
      return json(400, { message: "Missing params" });
    }

    await connectDB();

    // 1️⃣ Try deleting an actual share
    const share = await PrivateShare.findOneAndDelete({
      _id: shareId,
      ownerId,
    });

    if (share) {
      return json(200, { ok: true, type: "share" });
    }

    // 2️⃣ Otherwise try deleting a pending invite
    const invite = await PendingPrivateShareInvite.findOneAndDelete({
      _id: shareId,
      ownerId,
    });

    if (invite) {
      return json(200, { ok: true, type: "invite" });
    }

    return json(404, { message: "Share or invite not found" });
  } catch (err) {
    console.error("DELETE /shares/[shareId] error:", err);
    return json(500, { message: "Failed to delete share" });
  }
}
