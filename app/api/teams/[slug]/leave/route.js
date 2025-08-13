// app/api/teams/[slug]/leave/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { createNotification } from "@/lib/createNotification";

// ⬇️ New: centralized mailer (Resend + policy)
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(req, context) {
  await connectDB();
  const { slug } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { membershipId } = await req.json();
  if (!membershipId) {
    return NextResponse.json(
      { error: "Missing membershipId" },
      { status: 400 }
    );
  }

  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const membership = await TeamMember.findById(membershipId);
  if (!membership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  const isOwnedByUser = membership.userId?.toString() === user._id.toString();
  if (!isOwnedByUser) {
    return NextResponse.json(
      { error: "You don't have permission to remove this member." },
      { status: 403 }
    );
  }

  if (membership.role === "manager") {
    return NextResponse.json(
      { error: "Managers must transfer ownership before leaving." },
      { status: 400 }
    );
  }

  // Determine member display name (user or family member)
  let leavingName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username;
  if (membership.familyMemberId) {
    const family = await FamilyMember.findById(membership.familyMemberId);
    if (family) {
      leavingName = `${family.firstName} ${family.lastName}`.trim();
    }
  }

  // Delete membership
  await TeamMember.findByIdAndDelete(membershipId);

  // Fetch all managers
  const managerMembers = await TeamMember.find({
    teamId: team._id,
    role: "manager",
  });

  // Filter out the leaving user (if they are also a manager elsewhere)
  const managerUserIds = managerMembers
    .map((m) => m.userId?.toString())
    .filter((id) => id && id !== user._id.toString());

  // In-app notifications to managers
  await Promise.all(
    managerUserIds.map((managerUserId) =>
      createNotification({
        userId: managerUserId,
        type: "Team Update",
        body: `${leavingName} left ${team.teamName}`,
        link: `/teams/${slug}`,
      })
    )
  );

  // Email managers (respects prefs + 24h dedupe via Mail.kinds.TEAM_UPDATE)
  try {
    if (managerUserIds.length) {
      const managers = await User.find({ _id: { $in: managerUserIds } });

      const subject = `${leavingName} left ${team.teamName} on MatScout`;
      const message = `
        <p>Hello,</p>
        <p><strong>${leavingName}</strong> has left <strong>${
        team.teamName
      }</strong>.</p>
        <p>You can review your team members here:</p>
        <p>
          <a href="https://matscout.com/teams/${encodeURIComponent(
            slug
          )}/members"
            style="display:inline-block;background-color:#1a73e8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold;">
            View Team Members
          </a>
        </p>
      `;

      const html = baseEmailTemplate({
        title: "Team Update",
        message,
        logoUrl:
          "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
      });

      // Send one email per manager; policy will:
      // - Check manager.notificationSettings.teamUpdates.email
      // - Apply 24h dedupe via relatedUserId (leaver) + teamId
      await Promise.all(
        managers.map(async (mgr) => {
          try {
            const result = await Mail.sendEmail({
              type: Mail.kinds.TEAM_UPDATE,
              toUser: mgr,
              subject,
              html,
              relatedUserId: membership.familyMemberId
                ? membership.familyMemberId.toString()
                : user._id.toString(),
              teamId: team._id.toString(),
            });

            if (!result.sent) {
              // reasons: "user_pref_opt_out" | "rate_limited_24h" | "missing_recipient"
              console.warn(
                "Team update email skipped:",
                mgr.email,
                result.reason
              );
            }
          } catch (e) {
            console.error("Failed to email manager", mgr._id?.toString(), e);
          }
        })
      );
    }
  } catch (emailErr) {
    // Don’t fail the request just because email failed
    console.error("❌ Team update email error:", emailErr);
  }

  return NextResponse.json({ success: true });
}
