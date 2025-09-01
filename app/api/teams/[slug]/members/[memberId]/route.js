// app/api/teams/[slug]/members/[memberId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { createNotification } from "@/lib/createNotification";

// Optional: your mailer bits — keep as-is if you already had them
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function PATCH(request, { params }) {
  await connectDB();

  const actor = await getCurrentUser();
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, memberId } = await params; // await required in Next 15

  const team = await Team.findOne({ teamSlug: slug });
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Determine acting role (owner without TeamMember row is still staff)
  const isOwner = String(team.user) === String(actor._id);
  const actingLink = await TeamMember.findOne({
    teamId: team._id,
    userId: actor._id,
  })
    .select("role")
    .lean();

  const actingRole = (
    actingLink?.role || (isOwner ? "owner" : "")
  ).toLowerCase();
  const canEdit = ["owner", "manager", "coach"].includes(actingRole);
  if (!canEdit)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role } = await request.json();
  const allowedRoles = ["pending", "member", "coach", "manager", "declined"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const tm = await TeamMember.findById(memberId);
  if (!tm)
    return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const prevRole = tm.role;

  // Get recipient (user) for notifications/mail
  const recipientUser = tm.userId ? await User.findById(tm.userId) : null;
  if (!recipientUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Notification copy
  const isDeclined = role === "declined";
  const isApproval =
    prevRole === "pending" && !isDeclined && role !== "pending";
  const isRoleChangeAfterApproval =
    !isDeclined &&
    prevRole !== "pending" &&
    role !== "pending" &&
    prevRole !== role;

  const notifText = isDeclined
    ? `Your request to join ${team.teamName} was denied`
    : isApproval
    ? `Your request to join ${team.teamName} was approved as ${role}`
    : isRoleChangeAfterApproval
    ? `Your role in ${team.teamName} was updated to ${role}`
    : `Your status in ${team.teamName} is now ${role}`;

  try {
    await createNotification({
      userId: recipientUser._id,
      type: isDeclined || isApproval ? "Join Request" : "Role Update",
      body: notifText,
      link: `/teams/${slug}`,
    });
  } catch (e) {
    console.error("Notification failed:", e);
  }

  // Optional email
  try {
    const subject = isDeclined
      ? `Your request to join ${team.teamName} was denied`
      : isApproval
      ? `You're approved to join ${team.teamName} as ${role}`
      : isRoleChangeAfterApproval
      ? `Your role in ${team.teamName} was updated to ${role}`
      : `Your status in ${team.teamName} changed to ${role}`;

    const html = baseEmailTemplate({
      title: isDeclined
        ? "Join Request Denied"
        : isApproval
        ? "Join Request Approved"
        : "Team Role Update",
      message: `<p>${notifText}</p>`,
      logoUrl:
        "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
    });

    const result = await Mail.sendEmail({
      type:
        isDeclined || isApproval
          ? Mail.kinds.JOIN_REQUEST
          : Mail.kinds.TEAM_UPDATE,
      toUser: recipientUser,
      subject,
      html,
      relatedUserId: tm.familyMemberId
        ? String(tm.familyMemberId)
        : String(recipientUser._id),
      teamId: String(team._id),
    });

    if (!result.sent) {
      console.warn(
        "Member status email skipped:",
        recipientUser.email,
        result.reason
      );
    }
  } catch (e) {
    console.error("Email failed:", e);
  }

  if (isDeclined) {
    await TeamMember.deleteOne({ _id: memberId });
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const updated = await TeamMember.findByIdAndUpdate(
    memberId,
    { role },
    { new: true }
  );

  return NextResponse.json(
    { success: true, member: { id: String(updated._id), role: updated.role } },
    { status: 200 }
  );
}
