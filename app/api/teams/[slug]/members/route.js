// app/api/teams/[slug]/members/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(_req, { params }) {
  await connectDB();

  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params; // Next 15: await params
  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const ownerId = String(team.user || team.userId || "");
  const isOwner = ownerId === String(viewer._id);

  const link = await TeamMember.findOne({
    teamId: team._id,
    userId: viewer._id,
    deletedAt: null,
  })
    .select("role")
    .lean();

  const viewerRole = isOwner
    ? "owner"
    : (link?.role || "").toLowerCase() || null;

  if (!viewerRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ IMPORTANT FIX: exclude soft-deleted members
  const raw = await TeamMember.find({
    teamId: team._id,
    deletedAt: null,
  }).lean();

  const members = await Promise.all(
    raw.map(async (m) => {
      if (m.familyMemberId) {
        const fm = await FamilyMember.findById(m.familyMemberId).lean();
        if (!fm) return null;

        return {
          id: String(m._id),
          role: (m.role || "").toLowerCase(),
          isFamilyMember: true,
          isOwner: false,
          familyMemberId: String(fm._id),
          userId: null,
          name: `${fm.firstName || ""} ${fm.lastName || ""}`.trim(),
          username: fm.username || null,
          avatarUrl: fm.avatar || null,
        };
      }

      if (m.userId) {
        const u = await User.findById(m.userId).lean();
        if (!u) return null;

        let avatarUrl = u.avatar || null;
        if (u.avatarType === "google") avatarUrl = u.googleAvatar || avatarUrl;
        if (u.avatarType === "facebook")
          avatarUrl = u.facebookAvatar || avatarUrl;

        return {
          id: String(m._id),
          role: (m.role || "").toLowerCase(),
          isFamilyMember: false,
          isOwner: false,
          familyMemberId: null,
          userId: String(u._id),
          name:
            `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
            u.username ||
            u.email ||
            "Member",
          username: u.username || null,
          avatarUrl,
        };
      }

      return null;
    })
  );

  const clean = members.filter(Boolean);

  // Ensure owner row exists
  const hasOwnerRow = clean.some(
    (m) => !m.isFamilyMember && m.userId === ownerId
  );

  if (!hasOwnerRow) {
    const owner = await User.findById(ownerId).lean();
    if (owner) {
      let avatarUrl = owner.avatar || null;
      if (owner.avatarType === "google")
        avatarUrl = owner.googleAvatar || avatarUrl;
      if (owner.avatarType === "facebook")
        avatarUrl = owner.facebookAvatar || avatarUrl;

      clean.unshift({
        id: `owner-${team._id}`,
        role: "manager",
        isFamilyMember: false,
        isOwner: true,
        familyMemberId: null,
        userId: ownerId,
        name:
          `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
          owner.username ||
          owner.email ||
          "Team Owner",
        username: owner.username || null,
        avatarUrl,
      });
    }
  }

  const isStaff = ["owner", "manager", "coach"].includes(viewerRole);
  const filtered = isStaff
    ? clean
    : clean.filter((m) => ["member", "manager", "coach"].includes(m.role));

  return NextResponse.json({ viewerRole, members: filtered }, { status: 200 });
}
