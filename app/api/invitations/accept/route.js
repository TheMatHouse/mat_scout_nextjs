// app/api/invitations/accept/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

function norm(s = "") {
  return String(s).trim();
}
function lower(s = "") {
  return norm(s).toLowerCase();
}

export async function POST(req) {
  try {
    await connectDB();
    const { token: rawToken, familyMemberId, createFamily } = await req.json();

    const token = norm(rawToken || "");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const now = new Date();

    const invite = await TeamInvitation.findOne({
      $and: [
        { $or: [{ revokedAt: { $exists: false } }, { revokedAt: null }] },
        { $or: [{ acceptedAt: { $exists: false } }, { acceptedAt: null }] },
        { $or: [{ token }, { "payload.token": token }] },
      ],
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    const rawExpires = invite.expiresAt ?? invite?.payload?.expiresAt ?? null;
    const expiresAt = rawExpires ? new Date(rawExpires) : null;
    if (expiresAt && expiresAt <= now) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    const team = await Team.findById(invite.teamId).select(
      "_id teamSlug teamName"
    );
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce email match for adult invites if an invited email exists
    if (!invite.isMinor) {
      const invited = lower(invite.email || "");
      const loggedIn = lower(user.email || "");
      if (invited && invited !== loggedIn) {
        return NextResponse.json(
          { error: "Please sign in with the invited email" },
          { status: 400 }
        );
      }
    }

    const role = invite.role || invite?.payload?.role || "member";
    const membershipPayload = { teamId: team._id, role };

    if (invite.isMinor) {
      let familyMemberDoc = null;

      if (familyMemberId) {
        familyMemberDoc = await FamilyMember.findOne({
          _id: familyMemberId,
          userId: user._id,
        });
        if (!familyMemberDoc) {
          return NextResponse.json(
            { error: "Invalid family member" },
            { status: 400 }
          );
        }
      } else if (createFamily) {
        const first =
          invite.inviteeFirstName ||
          invite.firstName ||
          invite?.payload?.firstName ||
          "";
        const last =
          invite.inviteeLastName ||
          invite.lastName ||
          invite?.payload?.lastName ||
          "";
        familyMemberDoc = await FamilyMember.create({
          userId: user._id,
          firstName: norm(first),
          lastName: norm(last),
        });
      } else {
        return NextResponse.json(
          { error: "Family member required" },
          { status: 400 }
        );
      }

      membershipPayload.familyMemberId = familyMemberDoc._id;
      membershipPayload.userId = user._id; // parent owner
    } else {
      membershipPayload.userId = user._id;
    }

    // Idempotent upsert
    await TeamMember.updateOne(
      {
        teamId: team._id,
        ...(membershipPayload.familyMemberId
          ? { familyMemberId: membershipPayload.familyMemberId }
          : { userId: user._id, familyMemberId: { $exists: false } }),
      },
      { $setOnInsert: membershipPayload },
      { upsert: true }
    );

    // Mark accepted
    const acceptedAt = new Date();
    invite.acceptedAt = acceptedAt;
    invite.acceptedByUserId = user._id;
    invite.status = "accepted";
    if (invite.payload && typeof invite.payload === "object") {
      invite.payload.acceptedAt = acceptedAt;
      invite.payload.acceptedByUserId = user._id;
      invite.payload.status = "accepted";
    }
    await invite.save();

    return NextResponse.json(
      { ok: true, teamSlug: team.teamSlug },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/invitations/accept failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
