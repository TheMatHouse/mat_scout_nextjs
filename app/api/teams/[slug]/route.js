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

// ✅ GET: Fetch team details
export async function GET(request, { params }) {
  await connectDB();
  const { slug } = params;

  try {
    const team = await Team.findOne({ teamSlug: slug });

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ✅ DELETE: Delete team (only owner)
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug } = params;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Find team
    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // ✅ Validate owner
    if (team.user.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Fetch all team members
    const members = await TeamMember.find({ teamId: team._id });
    const memberUserIds = members
      .map((m) => m.userId?.toString())
      .filter((id) => id && id !== currentUser._id.toString()); // exclude owner

    // ✅ Create notifications for all members
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

    // ✅ Send emails (optional but included)
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

    // ✅ Delete team members
    await TeamMember.deleteMany({ teamId: team._id });

    // ✅ Delete scouting reports
    await ScoutingReport.deleteMany({ teamId: team._id });

    // ✅ Delete the team
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
