// app/api/email/join-request/route.js
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/email";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel"; // adjust path as needed
import User from "@/models/userModel"; // adjust path as needed

export async function POST(req) {
  try {
    const { teamId, requesterId } = await req.json();

    await connectDB();

    const team = await Team.findById(teamId).populate("user");
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const requester = await User.findById(requesterId);
    if (!requester)
      return NextResponse.json(
        { error: "Requester not found" },
        { status: 404 }
      );

    const to = team.user.email;
    const subject = `Join Request for ${team.teamName}`;
    // const html = `
    //   <h2>Join Request</h2>
    //   <p><strong>${requester.firstName} ${requester.lastName}</strong> has requested to join your team: <strong>${team.teamName}</strong>.</p>
    //   <p>You can review requests in your dashboard.</p>
    // `;

    // await sendEmail({ to, subject, html });

    return NextResponse.json({ message: "Email sent to team creator." });
  } catch (err) {
    console.error("Join request email error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
