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

  // Parse optional body
  let familyMemberId = null;
  let joinedVia = null;

  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text);
      familyMemberId = body?.familyMemberId || null;
      joinedVia = body?.joinedVia || null;
    }
  } catch {
    // ignore parse errors
  }

  // 🛑 Owner guard
  if (!familyMemberId && String(team.user) === String(user._id)) {
    return NextResponse.json(
      { error: "Owner is already part of the team" },
      { status: 409 }
    );
  }

  // Joiner identity (user or family member)
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

  // Prevent duplicates
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
      ...(joinedVia && { joinedVia }), // ✅ NEW (optional)
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

    const response = NextResponse.json(
      { message: "Request submitted" },
      { status: 200 }
    );

    // Best-effort email to owner
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
            <p>Please <a href="https://matscout.com/login">sign in</a> to approve or deny this request.</p>
          `,
          logoUrl:
            "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
        });

        await Mail.sendEmail({
          type: Mail.kinds.JOIN_REQUEST,
          toUser: owner,
          subject,
          html,
          relatedUserId: joinerId,
          teamId: String(team._id),
        });
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
