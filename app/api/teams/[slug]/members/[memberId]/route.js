// app/api/team/members/[memberId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { createNotification } from "@/lib/createNotification";

// ⬇️ new: centralized mailer (Resend + policy)
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function PATCH(request, { params }) {
  await connectDB();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, memberId } = params;

  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Ensure current user is a manager on this team
  const actingMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: user._id,
  });
  if (!actingMembership || actingMembership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body;
  const allowedRoles = ["pending", "member", "coach", "manager", "declined"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const teamMember = await TeamMember.findById(memberId);
  if (!teamMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const prevRole = teamMember.role;
  const isDeclined = role === "declined";
  const isApproval =
    prevRole === "pending" && !isDeclined && role !== "pending";
  const isRoleChangeAfterApproval =
    !isDeclined &&
    prevRole !== "pending" &&
    role !== "pending" &&
    prevRole !== role;

  // Fetch the owning user (email recipient)
  const requester = await User.findById(teamMember.userId);
  if (!requester) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build recipient display name (family member if applicable)
  let recipientName = requester.firstName || requester.username;
  let relatedUserId = requester._id.toString();

  if (teamMember.familyMemberId) {
    const family = await FamilyMember.findById(teamMember.familyMemberId);
    if (family) {
      recipientName = `${family.firstName} ${family.lastName}`.trim();
      relatedUserId = family._id.toString();
    }
  }

  // In-app notification text
  const notifBody = isDeclined
    ? `Your request to join ${team.teamName} was denied`
    : isApproval
    ? `Your request to join ${team.teamName} was approved as ${role}`
    : isRoleChangeAfterApproval
    ? `Your role in ${team.teamName} was updated to ${role}`
    : `Your status in ${team.teamName} is now ${role}`;

  // Create in-app notification
  try {
    await createNotification({
      userId: requester._id,
      type: isDeclined || isApproval ? "Join Request" : "Role Update",
      body: notifBody,
      link: `/teams/${slug}`,
    });
  } catch (notifErr) {
    console.error("❌ Failed to create role/join notification:", notifErr);
  }

  // Prepare email (subject + message vary by scenario)
  const subject = isDeclined
    ? `Your request to join ${team.teamName} was denied`
    : isApproval
    ? `You're approved to join ${team.teamName} as ${role}`
    : isRoleChangeAfterApproval
    ? `Your role in ${team.teamName} was updated to ${role}`
    : `Your status in ${team.teamName} changed to ${role}`;

  const message = (() => {
    if (isDeclined) {
      return `
        <p>Hi ${recipientName},</p>
        <p>Your request to join <strong>${team.teamName}</strong> has been <strong>denied</strong>.</p>
        <p>If you think this was a mistake, please contact the team's manager or coach.</p>
      `;
    }
    if (isApproval) {
      return `
        <p>Hi ${recipientName},</p>
        <p>Your request to join <strong>${team.teamName}</strong> has been <strong>approved</strong>.</p>
        <p>Your role on the team is: <strong>${role}</strong>.</p>
        <p>You can view your team here after signing in.</p>
      `;
    }
    if (isRoleChangeAfterApproval) {
      return `
        <p>Hi ${recipientName},</p>
        <p>Your role in <strong>${team.teamName}</strong> has been updated to <strong>${role}</strong>.</p>
      `;
    }
    return `
      <p>Hi ${recipientName},</p>
      <p>Your status in <strong>${team.teamName}</strong> is now <strong>${role}</strong>.</p>
    `;
  })();

  const html = baseEmailTemplate({
    title: isDeclined
      ? "Join Request Denied"
      : isApproval
      ? "Join Request Approved"
      : "Team Role Update",
    message,
    logoUrl:
      "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
  });

  // Email: respect user prefs + 24h dedupe using policy
  try {
    const emailType =
      isDeclined || isApproval
        ? Mail.kinds.JOIN_REQUEST
        : Mail.kinds.TEAM_UPDATE;

    const result = await Mail.sendEmail({
      type: emailType,
      toUser: requester,
      subject,
      html,
      relatedUserId, // drives dedupe
      teamId: team._id.toString(), // drives dedupe
    });

    if (!result.sent) {
      // reasons: "user_pref_opt_out" | "rate_limited_24h" | "missing_recipient"
      console.warn(
        "Member status email skipped:",
        requester.email,
        result.reason
      );
    }
  } catch (err) {
    console.error("❌ Failed to send member status email:", err);
  }

  // Persist the change
  if (isDeclined) {
    await TeamMember.deleteOne({ _id: memberId });
    return NextResponse.json({ success: true }, { status: 200 });
  } else {
    const updated = await TeamMember.findByIdAndUpdate(
      memberId,
      { role },
      { new: true }
    );
    return NextResponse.json(
      { success: true, member: { id: memberId, role: updated.role } },
      { status: 200 }
    );
  }
}
