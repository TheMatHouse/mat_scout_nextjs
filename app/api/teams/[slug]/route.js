// app/api/teams/[slug]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import ScoutingReport from "@/models/scoutingReportModel";
import User from "@/models/userModel";
import { getCurrentUser } from "@/lib/auth-server";
import { createNotification } from "@/lib/createNotification";
import { sendEmail } from "@/lib/email/email";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const dynamic = "force-dynamic";

// ✅ GET: Fetch team details
export async function GET(request, ctx) {
  await connectDB();
  const { slug } = await ctx.params;
  console.log("TEAM ROUTE HIT!");
  try {
    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }
    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ✅ PATCH: Update team (owner only). Return the FULL updated document.
export async function PATCH(req, ctx) {
  try {
    await connectDB();
    const { slug } = await ctx.params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // Owner-only (you can relax to manager later if desired)
    if (team.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Only allow these fields to be updated
    const allowed = [
      "info",
      "email",
      "phone",
      "address",
      "address2",
      "city",
      "state",
      "postalCode",
      "country",
      // add more allowed fields here if needed
    ];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        team[k] = body[k] ?? "";
      }
    }

    await team.save();

    // 🔁 Re-fetch to ensure we return the FULL up-to-date doc (no select restrictions)
    const full = await Team.findById(team._id).lean();

    // Return the full object directly so the client can re-hydrate context + form
    return NextResponse.json(full, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/teams/[slug] error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ✅ DELETE: Delete team (owner only)
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug } = params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Owner-only
    if (team.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Notify members
    const members = await TeamMember.find({ teamId: team._id });
    const memberUserIds = members
      .map((m) => m.userId?.toString())
      .filter((id) => id && id !== currentUser._id.toString());

    await Promise.all(
      memberUserIds.map((userId) =>
        createNotification({
          userId,
          type: "Team Deleted",
          body: `${team.teamName} has been deleted`,
          link: "/teams",
        })
      )
    );

    // Best-effort email
    try {
      const users = await User.find({ _id: { $in: memberUserIds } });
      const emailPromises = users.map((u) => {
        const html = baseEmailTemplate({
          title: "Team Deleted",
          message: `
            <p>Hello ${u.firstName || u.username},</p>
            <p>The team <strong>${
              team.teamName
            }</strong> has been deleted by the owner.</p>
            <p>You no longer have access to this team in MatScout.</p>
          `,
          logoUrl:
            "https://res.cloudinary.com/matscout/image/upload/v1752188084/matScout_email_logo_rx30tk.png",
        });

        return sendEmail({
          to: u.email,
          subject: `${team.teamName} has been deleted`,
          html,
        });
      });

      await Promise.all(emailPromises);
    } catch (emailErr) {
      console.error("Failed to send team deletion emails:", emailErr);
    }

    // Clean up
    await TeamMember.deleteMany({ teamId: team._id });
    await ScoutingReport.deleteMany({ teamId: team._id });
    await Team.deleteOne({ _id: team._id });

    return NextResponse.json({ success: true, message: "Team deleted" });
  } catch (err) {
    console.error("DELETE team error:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
