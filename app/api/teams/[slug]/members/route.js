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

  const { slug } = await params; // Next 15 requires awaiting params
  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Determine viewer role (owner counts as staff even without a TeamMember row)
  const isOwner = String(team.user) === String(viewer._id);
  const link = await TeamMember.findOne({
    teamId: team._id,
    userId: viewer._id,
  })
    .select("role")
    .lean();

  const viewerRole =
    (link?.role || (isOwner ? "owner" : null))?.toLowerCase() || null;
  if (!viewerRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull all TeamMember rows
  const raw = await TeamMember.find({ teamId: team._id }).lean();

  // Map rows -> display objects
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
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          username: u.username || null,
          avatarUrl,
        };
      }

      return null;
    })
  );

  const clean = members.filter(Boolean);

  // ✅ Ensure the OWNER appears as a non-editable "manager" row
  const ownerId = String(team.user);
  const hasOwnerInList = clean.some(
    (m) => !m.isFamilyMember && m.userId === ownerId
  );

  if (!hasOwnerInList) {
    const owner = await User.findById(ownerId).lean();
    if (owner) {
      let avatarUrl = owner.avatar || null;
      if (owner.avatarType === "google")
        avatarUrl = owner.googleAvatar || avatarUrl;
      if (owner.avatarType === "facebook")
        avatarUrl = owner.facebookAvatar || avatarUrl;

      clean.unshift({
        id: `owner-${team._id}`, // synthetic id
        role: "manager", // show as manager
        isFamilyMember: false,
        isOwner: true, // <-- flag for UI to lock editing
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
