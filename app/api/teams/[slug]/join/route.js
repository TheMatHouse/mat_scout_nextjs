// app/api/teams/[slug]/join/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import { createNotification } from "@/lib/createNotification";

// ⬇️ New: centralized mailer (Resend + policy)
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(req, context) {
  await connectDB();

  const { slug } = await context.params;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const owner = await User.findById(team.user);
  const ownerEmail = owner?.email;

  let familyMemberId = null;
  let joinerName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;
  let joinerId = user._id.toString();

  // Optional body for family member join
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text);
      familyMemberId = body?.familyMemberId || null;

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
        joinerId = familyMember._id.toString();
      }
    }
  } catch {
    // ignore parse errors
  }

  // Already requested or a member?
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

  try {
    await TeamMember.create({
      teamId: team._id,
      userId: user._id,
      role: "pending",
      ...(familyMemberId && { familyMemberId }),
    });

    // In-app notification for the team owner
    try {
      await createNotification({
        userId: team.user,
        type: "Join Request",
        body: `${joinerName} requested to join ${team.teamName}`,
        link: `/teams/${slug}/members`,
      });
    } catch (notifErr) {
      console.error("❌ Failed to create join request notification:", notifErr);
    }

    // Prepare HTTP response first (don’t block user on email)
    const response = NextResponse.json(
      { message: "Request submitted" },
      { status: 200 }
    );

    // Email the owner (policy: respects prefs + 24h dedupe)
    if (owner && ownerEmail) {
      const subject = `${joinerName} Requests to Join ${team.teamName} at MatScout!`;
      const message = `
        <p>Hello ${owner.firstName || owner.username},</p>
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
      `;

      const html = baseEmailTemplate({
        title: "New Team Join Request",
        message,
        logoUrl:
          "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
      });

      try {
        const result = await Mail.sendEmail({
          type: Mail.kinds.JOIN_REQUEST, // ✅ checks owner.notificationSettings.joinRequests.email
          toUser: owner,
          subject,
          html,
          relatedUserId: joinerId, // used in dedupe key
          teamId: team._id.toString(), // used in dedupe key
        });

        if (!result.sent) {
          // Common reasons: "rate_limited_24h" or "user_pref_opt_out"
          console.warn("Join request email skipped:", result.reason);
        }
      } catch (emailErr) {
        console.error("❌ Failed to send join request email:", emailErr);
      }
    }

    return response;
  } catch (err) {
    console.error("❌ Error creating team member:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
