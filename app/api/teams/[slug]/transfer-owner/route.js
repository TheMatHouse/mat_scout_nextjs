// app/api/teams/[slug]/transfer-owner/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const dynamic = "force-dynamic";

const ALLOWED_NEW_ROLES_FOR_PREV_OWNER = new Set([
  "member",
  "manager",
  "coach",
]);

export async function POST(req, ctx) {
  await connectDB();

  const session = await startSessionSafe();
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await ctx.params;

    // Team uses teamSlug
    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

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
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const newOwnerUserId = String(body?.newOwnerUserId || "").trim();
    const myNewRole = String(body?.myNewRole || "")
      .trim()
      .toLowerCase();

    if (!newOwnerUserId) {
      return NextResponse.json(
        { message: "newOwnerUserId is required." },
        { status: 400 }
      );
    }
    if (!ALLOWED_NEW_ROLES_FOR_PREV_OWNER.has(myNewRole)) {
      return NextResponse.json(
        { message: "Invalid myNewRole." },
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

    // Ensure target user is a manager (no status field in your schema)
    const targetMembership = await TeamMember.findOne({
      teamId: team._id,
      userId: targetUser._id,
      role: "manager",
    });

    if (!targetMembership) {
      return NextResponse.json(
        {
          message:
            "Target user must be a manager of the team before transferring ownership.",
        },
        { status: 400 }
      );
    }

    const previousOwnerId = team.user.toString();

    // === Transaction for atomicity ===
    await session.withTransaction(async () => {
      // 1) Set new owner on Team
      team.user = targetUser._id;
      await team.save({ session });

      // 2) Ensure new owner has a TeamMember row; set role to "owner"
      const newOwnerMember = await TeamMember.findOne({
        teamId: team._id,
        userId: targetUser._id,
      }).session(session);

      if (newOwnerMember) {
        newOwnerMember.role = "owner";
        await newOwnerMember.save({ session });
      } else {
        await TeamMember.create(
          [
            {
              teamId: team._id,
              userId: targetUser._id,
              role: "owner",
            },
          ],
          { session }
        );
      }

      // 3) Previous owner becomes myNewRole (ensure a membership exists)
      const prevOwnerMember = await TeamMember.findOne({
        teamId: team._id,
        userId: previousOwnerId,
      }).session(session);

      if (prevOwnerMember) {
        prevOwnerMember.role = myNewRole;
        await prevOwnerMember.save({ session });
      } else {
        await TeamMember.create(
          [
            {
              teamId: team._id,
              userId: previousOwnerId,
              role: myNewRole,
            },
          ],
          { session }
        );
      }
    });

    // === Emails (best-effort, outside the transaction) ===
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

      const prevOwnerName =
        [prevOwnerUser?.firstName, prevOwnerUser?.lastName]
          .filter(Boolean)
          .join(" ") ||
        prevOwnerUser?.username ||
        "";

      const htmlPrev = baseEmailTemplate({
        title: "Team ownership transferred",
        message: `
          <p>Hello ${prevOwnerName},</p>
          <p>You transferred ownership of <strong>${team.teamName}</strong> to ${ownerName}.</p>
          <p>Your new role on the team is <strong>${myNewRole}</strong>.</p>
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
  } catch (err) {
    console.error("POST /transfer-owner error", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  } finally {
    endSessionSafe(session);
  }
}

async function startSessionSafe() {
  try {
    return await mongoose.startSession();
  } catch {
    return null;
  }
}
function endSessionSafe(session) {
  if (session) {
    try {
      session.endSession();
    } catch {}
  }
}
