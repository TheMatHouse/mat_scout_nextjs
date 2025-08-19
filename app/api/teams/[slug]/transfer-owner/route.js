// app/api/teams/[slug]/transfer-owner/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const dynamic = "force-dynamic";

export async function POST(req, ctx) {
  await connectDB();

  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;

  const team = await Team.findOne({ teamSlug: slug });
  if (!team)
    return NextResponse.json({ message: "Team not found" }, { status: 404 });

  const isOwner = team.user?.toString() === me._id.toString();
  if (!isOwner) {
    return NextResponse.json(
      { message: "Only the team owner can transfer ownership." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const newOwnerUserId = String(body?.newOwnerUserId || "").trim();
  if (!newOwnerUserId) {
    return NextResponse.json(
      { message: "newOwnerUserId is required." },
      { status: 400 }
    );
  }

  if (newOwnerUserId === me._id.toString()) {
    return NextResponse.json(
      { message: "You already own this team." },
      { status: 400 }
    );
  }

  // Ensure target user exists
  const targetUser = await User.findById(newOwnerUserId).select(
    "_id email firstName lastName username"
  );
  if (!targetUser) {
    return NextResponse.json(
      { message: "Target user not found." },
      { status: 404 }
    );
  }

  // Ensure target user is a team member
  let targetMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: targetUser._id,
  });

  if (!targetMembership) {
    return NextResponse.json(
      {
        message:
          "User must be a member of the team before transferring ownership.",
      },
      { status: 400 }
    );
  }

  // Flip ownership
  const previousOwnerId = team.user.toString();
  team.user = targetUser._id;
  await team.save();

  // Role hygiene (optional, but recommended):
  // - Ensure new owner at least has "manager"
  if (targetMembership.role !== "manager") {
    targetMembership.role = "manager";
    await targetMembership.save();
  }
  // - Ensure previous owner remains as "manager" (if they have a membership)
  let prevMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: previousOwnerId,
  });
  if (!prevMembership) {
    prevMembership = await TeamMember.create({
      teamId: team._id,
      userId: previousOwnerId,
      role: "manager",
    });
  } else if (prevMembership.role !== "manager") {
    prevMembership.role = "manager";
    await prevMembership.save();
  }

  // Notify both parties by email (best-effort)
  try {
    const ownerName =
      [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") ||
      targetUser.username ||
      "New Owner";
    const prevOwnerUser = await User.findById(previousOwnerId).select(
      "email firstName lastName username"
    );

    const htmlNew = baseEmailTemplate({
      title: "You are now the owner of the team",
      message: `
        <p>Hello ${ownerName},</p>
        <p>Ownership of <strong>${team.teamName}</strong> has been transferred to you.</p>
        <p>You can now manage team settings and members.</p>
      `,
    });

    const htmlPrev = baseEmailTemplate({
      title: "Team ownership transferred",
      message: `
        <p>Hello ${
          [prevOwnerUser?.firstName, prevOwnerUser?.lastName]
            .filter(Boolean)
            .join(" ") ||
          prevOwnerUser?.username ||
          ""
        },</p>
        <p>You transferred ownership of <strong>${
          team.teamName
        }</strong> to ${ownerName}.</p>
        <p>You remain a manager on the team.</p>
      `,
    });

    await Promise.all([
      targetUser?.email
        ? sendEmail({
            to: targetUser.email,
            subject: "MatScout — Team ownership updated",
            html: htmlNew,
          })
        : null,
      prevOwnerUser?.email
        ? sendEmail({
            to: prevOwnerUser.email,
            subject: "MatScout — Team ownership transferred",
            html: htmlPrev,
          })
        : null,
    ]);
  } catch (e) {
    console.error("transfer-owner email failed:", e);
  }

  return NextResponse.json(
    { message: "Ownership transferred.", teamSlug: team.teamSlug },
    { status: 200 }
  );
}
