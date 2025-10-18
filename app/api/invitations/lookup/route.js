// app/api/invitations/lookup/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

function norm(s = "") {
  return String(s).trim();
}
function lower(s = "") {
  return norm(s).toLowerCase();
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const token = norm(searchParams.get("token") || "");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const now = new Date();

    // Mirror the accept route's finder so both behave identically.
    const invite = await TeamInvitation.findOne({
      $and: [
        { $or: [{ revokedAt: { $exists: false } }, { revokedAt: null }] },
        { $or: [{ acceptedAt: { $exists: false } }, { acceptedAt: null }] },
        { $or: [{ token }, { "payload.token": token }] },
      ],
    }).lean();

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Expiry from top-level or payload
    const rawExpires = invite.expiresAt ?? invite?.payload?.expiresAt ?? null;
    const expiresAt = rawExpires ? new Date(rawExpires) : null;
    if (expiresAt && expiresAt <= now) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    // Load team
    const team = await Team.findById(invite.teamId)
      .select("_id teamSlug teamName")
      .lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // If the user is logged in, we can hint whether email must match (for adult invites).
    const user = await getCurrentUserFromCookies().catch(() => null);

    const role = invite.role || invite?.payload?.role || "member";
    const isMinor = !!invite.isMinor;

    let emailMatchRequired = false;
    let emailMismatch = false;
    if (!isMinor) {
      const invited = lower(invite.email || "");
      const logged = lower(user?.email || "");
      emailMatchRequired = Boolean(invited);
      if (emailMatchRequired && logged && invited !== logged) {
        emailMismatch = true;
      }
    }

    // Return summary for the accept screen
    return NextResponse.json(
      {
        ok: true,
        team: {
          id: String(team._id),
          slug: team.teamSlug,
          name: team.teamName,
        },
        invite: {
          id: String(invite._id),
          role,
          isMinor,
          inviteeFirstName:
            invite.inviteeFirstName ||
            invite.firstName ||
            invite?.payload?.firstName ||
            "",
          inviteeLastName:
            invite.inviteeLastName ||
            invite.lastName ||
            invite?.payload?.lastName ||
            "",
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          emailMatchRequired,
          emailMismatch,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/invitations/lookup failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
