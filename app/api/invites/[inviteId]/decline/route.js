export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";

/* ============================================================
   POST — decline a team invitation
============================================================ */
export async function POST(_req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId } = await params;
    if (!mongoose.Types.ObjectId.isValid(inviteId)) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 400 }
      );
    }

    const invite = await TeamInvitation.findById(inviteId);
    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 🚫 Terminal-state guards
    if (invite.status === "accepted") {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 409 }
      );
    }

    if (invite.status === "declined") {
      return NextResponse.json(
        { error: "Invitation already declined" },
        { status: 409 }
      );
    }

    if (invite.status === "revoked") {
      return NextResponse.json(
        { error: "Invitation was revoked" },
        { status: 400 }
      );
    }

    // 🔐 Email ownership check
    if (invite.email !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // ✅ Mark declined (terminal)
    invite.status = "declined";
    invite.declinedAt = new Date();
    await invite.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Decline invite error:", err);
    return NextResponse.json(
      { error: "Failed to decline invitation" },
      { status: 500 }
    );
  }
}
