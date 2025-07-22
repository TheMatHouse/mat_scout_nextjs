import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import EmailLog from "@/models/emailLog";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function PATCH(request, { params }) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, memberId } = await params;
  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // ensure current user is manager
  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId: user._id,
  });
  if (!membership || membership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body;
  if (!["pending", "member", "coach", "manager", "declined"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const teamMember = await TeamMember.findById(memberId);
  if (!teamMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const isDeclined = role === "declined";

  // Get user info
  const requester = await User.findById(teamMember.userId);
  if (!requester) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let recipientName = requester.firstName || requester.username;
  let recipientEmail = requester.email;
  let relatedUserId = requester._id.toString();

  // Handle family member
  if (teamMember.familyMemberId) {
    const family = await FamilyMember.findById(teamMember.familyMemberId);
    if (family) {
      recipientName = `${family.firstName} ${family.lastName}`;
      relatedUserId = family._id.toString();
    }
  }

  const type = "team_join_status";

  const existingLog = await EmailLog.findOne({
    to: recipientEmail,
    type,
    relatedUserId,
    teamId: team._id.toString(),
  });

  if (!existingLog) {
    const statusText = isDeclined ? "denied" : "approved";
    const message = `
      <p>Hi ${recipientName},</p>
      <p>Your request to join <strong>${
        team.teamName
      }</strong> has been <strong>${statusText}</strong>.</p>
      ${
        !isDeclined
          ? `<p>Your new role on the team is: <strong>${role}</strong>.</p>`
          : ""
      }
      <p>You can log in to MatScout to view your team status or contact your coach if you have questions.</p>
    `;

    const html = baseEmailTemplate({
      title: `Team Join Request ${isDeclined ? "Denied" : "Approved"}`,
      message,
      logoUrl:
        "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
    });

    try {
      await sendEmail({
        to: recipientEmail,
        subject: `Your Request to Join ${team.teamName} Was ${
          isDeclined ? "Denied" : `Approved as ${role}`
        }`,
        html,
      });
      await EmailLog.create({
        to: recipientEmail,
        type,
        relatedUserId,
        teamId: team._id.toString(),
      });
    } catch (err) {
      console.error("❌ Failed to send approval/denial email:", err);
    }
  }

  // Final DB action
  if (isDeclined) {
    await TeamMember.deleteOne({ _id: memberId });
    return NextResponse.json({ success: true });
  } else {
    const updated = await TeamMember.findByIdAndUpdate(
      memberId,
      { role },
      { new: true }
    );
    return NextResponse.json({
      success: true,
      member: { id: memberId, role: updated.role },
    });
  }
}
