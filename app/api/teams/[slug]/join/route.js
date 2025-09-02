// app/api/teams/[slug]/join/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import { createNotification } from "@/lib/createNotification";

// Centralized mailer (Resend + policy)
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(req, context) {
  await connectDB();

  const { slug } = await context.params;

  // Auth
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Team
  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Parse optional body (family member join)
  let familyMemberId = null;
  try {
    const text = await req.text(); // works even if body empty
    if (text) {
      const body = JSON.parse(text);
      familyMemberId = body?.familyMemberId || null;
    }
  } catch {
    // ignore parse errors
  }

  // 🛑 Owner guard: the team "owner" (team.user) is inherently part of the team.
  // They should NOT create a TeamMember row for themselves. Allow if adding a family member.
  if (!familyMemberId && String(team.user) === String(user._id)) {
    return NextResponse.json(
      { error: "Owner is already part of the team" },
      { status: 409 }
    );
  }

  // If joining on behalf of a family member, validate that family member belongs to the current user
  let joinerName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;
  let joinerId = String(user._id);

  if (familyMemberId) {
    const familyMember = await FamilyMember.findOne({
      _id: familyMemberId,
      userId: user._id,
    });

    if (!familyMember) {
      return NextResponse.json(
        { error: "Invalid family member" },
        { status: 400 }
      );
    }

    joinerName = `${familyMember.firstName || ""} ${
      familyMember.lastName || ""
    }`.trim();
    joinerId = String(familyMember._id);
  }

  // Prevent duplicates (pending or active) for this user/family member on this team
  const existing = await TeamMember.findOne({
    teamId: team._id,
    ...(familyMemberId
      ? { familyMemberId }
      : { userId: user._id, familyMemberId: { $exists: false } }),
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already requested or a member" },
      { status: 400 }
    );
  }

  // Create pending membership
  try {
    await TeamMember.create({
      teamId: team._id,
      userId: user._id,
      role: "pending",
      ...(familyMemberId && { familyMemberId }),
    });

    // Notify team owner in-app
    try {
      await createNotification({
        userId: team.user,
        type: "Join Request",
        body: `${joinerName} requested to join ${team.teamName}`,
        link: `/teams/${slug}/members`,
      });
    } catch (notifErr) {
      console.error("Failed to create join request notification:", notifErr);
    }

    // Prepare HTTP response first (don’t block on email)
    const response = NextResponse.json(
      { message: "Request submitted" },
      { status: 200 }
    );

    // Best-effort email to owner (respects prefs + 24h dedupe in Mail layer)
    try {
      const owner = await User.findById(team.user);
      if (owner?.email) {
        const subject = `${joinerName} Requests to Join ${team.teamName} at MatScout!`;
        const html = baseEmailTemplate({
          title: "New Team Join Request",
          message: `
            <p>Hello ${owner.firstName || owner.username || "there"},</p>
            <p><strong>${joinerName}</strong> has requested to join <strong>${
            team.teamName
          }</strong>.</p>
            <p>Please <a href="https://matscout.com/login" style="color:#1a73e8;">sign in</a> to approve or deny this request.</p>
            <p>
              <a href="https://matscout.com/login"
                style="display:inline-block;background-color:#1a73e8;color:white;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold;">
                Login to MatScout
              </a>
            </p>
          `,
          logoUrl:
            "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
        });

        const result = await Mail.sendEmail({
          type: Mail.kinds.JOIN_REQUEST,
          toUser: owner,
          subject,
          html,
          relatedUserId: joinerId, // used in dedupe key
          teamId: String(team._id), // used in dedupe key
        });

        if (!result.sent) {
          console.warn("Join request email skipped:", result.reason);
        }
      }
    } catch (emailErr) {
      console.error("Failed to send join request email:", emailErr);
    }

    return response;
  } catch (err) {
    console.error("Error creating team member:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
