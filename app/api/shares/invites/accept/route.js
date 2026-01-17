export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import PrivateShare from "@/models/privateShareModel";
import PendingPrivateShareInvite from "@/models/pendingPrivateShareInviteModel";

function json(status, payload) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* ============================================================
   POST — accept private share invite
   ============================================================ */
export async function POST(req) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) {
      return json(401, { message: "Unauthorized" });
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return json(400, { message: "Missing token" });
    }

    // Find invite (allow acceptedAt !== null for idempotency)
    const invite = await PendingPrivateShareInvite.findOne({
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return json(404, { message: "Invite invalid or expired" });
    }

    /* ---------- Create or fetch share (idempotent) ---------- */
    const shareQuery = {
      ownerId: invite.ownerId,
      documentType: invite.documentType,
      scope: invite.scope,
      ...(invite.scope === "one" ? { documentId: invite.documentId } : {}),
      "sharedWith.athleteType": "user",
      "sharedWith.athleteId": user._id,
    };

    const now = new Date();

    const share = await PrivateShare.findOneAndUpdate(
      shareQuery,
      {
        $setOnInsert: {
          ownerId: invite.ownerId,
          documentType: invite.documentType,
          ...(invite.scope === "one" ? { documentId: invite.documentId } : {}),
          scope: invite.scope,
          sharedWith: {
            athleteType: "user",
            athleteId: user._id,
          },
          createdAt: now,
        },
        $set: {
          updatedAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Mark accepted if not already
    if (!invite.acceptedAt) {
      invite.acceptedAt = now;
      invite.acceptedByUserId = user._id;
      await invite.save();
    }

    return json(200, {
      ok: true,
      shareId: share._id,
      redirect: "/dashboard/matches?view=shared",
    });
  } catch (err) {
    return json(500, {
      message: "Failed to accept invite",
      details: String(err?.message || err),
    });
  }
}
