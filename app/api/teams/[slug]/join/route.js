import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";
import User from "@/models/userModel";
import EmailLog from "@/models/emailLog";
import { createNotification } from "@/lib/createNotification"; // ✅ Added for notifications

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
    // silently ignore body parse failure
  }

  // ✅ Check if already a member (user or family)
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
    const newMember = await TeamMember.create({
      teamId: team._id,
      userId: user._id,
      role: "pending",
      ...(familyMemberId && { familyMemberId }),
    });

    // ✅ Create notification for team owner
    try {
      await createNotification({
        userId: team.user, // Team owner
        type: "Join Request",
        body: `${joinerName} requested to join ${team.teamName}`,
        link: `/teams/${slug}`,
      });
    } catch (notifErr) {
      console.error("❌ Failed to create join request notification:", notifErr);
    }

    const response = NextResponse.json(
      { message: "Request submitted" },
      { status: 200 }
    );

    // ✅ Email logic for join request
    if (ownerEmail) {
      const existingLog = await EmailLog.findOne({
        to: ownerEmail,
        type: "team_join_request",
        relatedUserId: joinerId,
        teamId: team._id.toString(),
      });

      if (!existingLog) {
        const subject = `${joinerName} Requests to Join ${team.teamName} at MatScout!`;
        const message = `
          <p>Hello ${owner.firstName || owner.username},</p>
          <p><strong>${joinerName}</strong> has requested to join <strong>${
          team.teamName
        }</strong>.</p>
          <p>Please <a href="https://matscout.com/login" style="color: #1a73e8;">sign in</a> to MatScout to approve or deny this request.</p>
          <p>
            <a href="https://matscout.com/login"
              style="display: inline-block; background-color: #1a73e8; color: white; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-weight: bold;">
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
          await sendEmail({ to: ownerEmail, subject, html });

          await EmailLog.create({
            to: ownerEmail,
            type: "team_join_request",
            relatedUserId: joinerId,
            teamId: team._id.toString(),
          });
        } catch (emailErr) {
          console.error("❌ Failed to send join email:", emailErr);
        }
      }
    }

    return response;
  } catch (err) {
    console.error("❌ Error creating team member:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
