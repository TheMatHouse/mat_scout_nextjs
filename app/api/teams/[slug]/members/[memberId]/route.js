// app/api/teams/[slug]/members/[memberId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";

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
  if (!["pending", "member", "manager", "declined"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // handle decline: remove membership
  if (role === "declined") {
    await TeamMember.deleteOne({ _id: memberId });
    return NextResponse.json({ success: true });
  }

  // otherwise update role
  const updated = await TeamMember.findByIdAndUpdate(
    memberId,
    { role },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    member: { id: memberId, role: updated.role },
  });
}
