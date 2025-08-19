// app/api/teams/[slug]/request-owner-transfer/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import { sendEmail } from "@/lib/email/email";

export const dynamic = "force-dynamic";

export async function POST(req, ctx) {
  await connectDB();

  const me = await getCurrentUser();
  if (!me)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;

  const team = await Team.findOne({ teamSlug: slug }).select(
    "_id teamName user"
  );
  if (!team)
    return NextResponse.json({ message: "Team not found" }, { status: 404 });

  // Must be a team member to request
  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  });
  if (!membership) {
    return NextResponse.json(
      { message: "Only team members can request ownership transfer." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { targetUserId, reason } = body || {};

  const adminEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { message: "Admin email is not configured." },
      { status: 500 }
    );
  }

  const lines = [
    `Team: ${team.teamName} (${slug})`,
    `Requested by User ID: ${me._id}`,
    `Target new owner (optional): ${targetUserId || "N/A"}`,
    `Reason: ${reason || "N/A"}`,
  ];

  try {
    await sendEmail({
      to: adminEmail,
      subject: `MatScout — Ownership Transfer Request (${team.teamName})`,
      text: lines.join("\n"),
      html: `<pre>${lines.join("\n")}</pre>`,
    });
  } catch (e) {
    console.error("request-owner-transfer email failed:", e);
    return NextResponse.json(
      { message: "Failed to send request." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Your request has been sent to the admins." },
    { status: 200 }
  );
}
