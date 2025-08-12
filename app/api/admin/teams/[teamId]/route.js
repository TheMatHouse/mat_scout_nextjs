// app/api/admin/teams/[teamId]/route.js
import { NextResponse } from "next/server";
import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
// ⬇️ make sure this path matches your actual model file
import FamilyMember from "@/models/familyMemberModel";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // Admin-only
    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meDoc = await User.findById(me._id).select("isAdmin role").lean();
    const isAdmin = !!(meDoc?.isAdmin || meDoc?.role === "admin");
    if (!isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { teamId } = await params;
    if (!isValidObjectId(teamId)) {
      return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
    }

    const team = await Team.findById(teamId)
      .select("_id teamName teamSlug logo user createdAt")
      .lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Memberships for this team
    const memberships = await TeamMember.find({ teamId: team._id })
      .select("_id teamId role createdAt userId familyMemberId")
      .lean();

    // Collect parent/regular user ids and family member ids
    const userIds = Array.from(
      new Set(
        memberships
          .map((m) => (m.userId ? String(m.userId) : null))
          .filter(Boolean)
      )
    ).filter((id) => Types.ObjectId.isValid(id));

    const famIds = Array.from(
      new Set(
        memberships
          .map((m) => (m.familyMemberId ? String(m.familyMemberId) : null))
          .filter(Boolean)
      )
    ).filter((id) => Types.ObjectId.isValid(id));

    // Load parents/users
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select("_id firstName lastName username email")
          .lean()
      : [];
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    // Load family members (from separate collection)
    const fams = famIds.length
      ? await FamilyMember.find({ _id: { $in: famIds } })
          .select("_id firstName lastName username email") // adjust fields if yours differ
          .lean()
      : [];
    const famMap = new Map(fams.map((f) => [String(f._id), f]));

    // Normalize rows
    const members = memberships.map((m) => {
      const role = String(m.role || "").toLowerCase();
      const createdAt = m.createdAt || null;

      // Family athlete path
      if (m.familyMemberId) {
        const fm = famMap.get(String(m.familyMemberId)) || {};
        const parent = userMap[String(m.userId)] || {};
        const name =
          [fm.firstName, fm.lastName].filter(Boolean).join(" ") ||
          fm.username ||
          "—";
        return {
          _id: String(m._id),
          role,
          createdAt,
          kind: "family",
          person: {
            _id: String(m.familyMemberId),
            name, // ✅ athlete's name from FamilyMember
            username: fm.username || "", // ✅ athlete's username from FamilyMember
            email: parent.email || "", // ✅ parent’s email (per your requirement)
          },
          parent: {
            _id: m.userId ? String(m.userId) : "",
            name:
              [parent.firstName, parent.lastName].filter(Boolean).join(" ") ||
              parent.username ||
              parent.email ||
              "",
            email: parent.email || "",
          },
        };
      }

      // Regular user path
      const u = userMap[String(m.userId)] || {};
      const name =
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        u.email ||
        "—";

      return {
        _id: String(m._id),
        role,
        createdAt,
        kind: "user",
        person: {
          _id: m.userId ? String(m.userId) : "",
          name,
          username: u.username || "",
          email: u.email || "",
        },
      };
    });

    // Pending invites (as before)
    const invites = await TeamInvitation.find({
      teamId: team._id,
      revokedAt: { $exists: false },
      acceptedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .select(
        "_id role isMinor inviteeFirstName inviteeLastName email parentEmail message expiresAt createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Stats
    const activeRoles = new Set(["manager", "coach", "member"]);
    const stats = {
      totalMembers: members.length,
      activeMembers: members.filter((m) => activeRoles.has(m.role)).length,
      pendingMembers: members.filter((m) => m.role === "pending").length,
      pendingInvites: invites.length,
    };

    return NextResponse.json({
      team: {
        _id: String(team._id),
        teamName: team.teamName,
        teamSlug: team.teamSlug,
        logo: team.logo || null,
        createdAt: team.createdAt,
        owner: team.user ? String(team.user) : null,
      },
      stats,
      members,
      invites: invites.map((i) => ({
        _id: String(i._id),
        role: i.role,
        isMinor: !!i.isMinor,
        inviteeFirstName: i.inviteeFirstName || "",
        inviteeLastName: i.inviteeLastName || "",
        email: i.isMinor ? i.parentEmail || "" : i.email || "",
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        message: i.message || "",
      })),
    });
  } catch (err) {
    console.error("GET /api/admin/teams/:teamId failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
