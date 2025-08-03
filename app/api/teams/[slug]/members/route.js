import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET(request, { params }) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ members: [] }, { status: 401 });

  const { slug } = await params;
  const team = await Team.findOne({ teamSlug: slug });
  if (!team) return NextResponse.json({ members: [] }, { status: 404 });

  // Only managers may fetch full list
  const me = await TeamMember.findOne({
    teamId: team._id,
    userId: user._id,
    familyMemberId: null,
  });
  if (!me || me.role !== "manager") {
    return NextResponse.json({ members: [] }, { status: 403 });
  }

  // Fetch all team members
  const raw = await TeamMember.find({ teamId: team._id });

  const members = await Promise.all(
    raw.map(async (m) => {
      if (m.familyMemberId) {
        const fm = await FamilyMember.findById(m.familyMemberId);
        if (!fm) return null;

        return {
          id: m._id.toString(),
          familyMemberId: fm._id.toString(),
          name: `${fm.firstName} ${fm.lastName}`,
          role: m.role,
          avatarUrl: fm.avatar || null,
          isFamilyMember: true,
          username: fm.username,
        };
      }

      if (m.userId) {
        const u = await User.findById(m.userId);
        if (!u) return null;

        let avatarUrl = u.avatar || null;
        if (u.avatarType === "google") avatarUrl = u.googleAvatar;
        if (u.avatarType === "facebook") avatarUrl = u.facebookAvatar;

        return {
          id: m._id.toString(),
          userId: u._id.toString(),
          name: `${u.firstName} ${u.lastName}`,
          role: m.role,
          avatarUrl,
          isFamilyMember: false,
          username: u.username,
        };
      }

      return null;
    })
  );

  const filtered = members.filter(Boolean);
  return NextResponse.json({ members: filtered });
}
