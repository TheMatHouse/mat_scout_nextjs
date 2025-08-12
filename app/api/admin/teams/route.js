// app/api/admin/teams/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";

export const dynamic = "force-dynamic";

function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meDoc = await User.findById(me._id).select("role isAdmin").lean();
    const isAdmin = !!(meDoc?.isAdmin || meDoc?.role === "admin");
    if (!isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );

    const filter = {};
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ teamName: re }, { teamSlug: re }];
    }

    const total = await Team.countDocuments(filter);

    const teams = await Team.find(filter)
      .select("_id teamName teamSlug logo user createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const teamIds = teams.map((t) => t._id);

    // Member counts (active vs pending)
    const memberAgg = await TeamMember.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      {
        $group: {
          _id: "$teamId",
          activeMembers: {
            $sum: {
              $cond: [{ $in: ["$role", ["manager", "coach", "member"]] }, 1, 0],
            },
          },
          pendingMembers: {
            $sum: { $cond: [{ $eq: ["$role", "pending"] }, 1, 0] },
          },
          totalMembers: { $sum: 1 },
        },
      },
    ]);

    const memberMap = Object.fromEntries(
      memberAgg.map((m) => [
        String(m._id),
        {
          activeMembers: m.activeMembers || 0,
          pendingMembers: m.pendingMembers || 0,
          totalMembers: m.totalMembers || 0,
        },
      ])
    );

    // Pending invites
    const inviteAgg = await TeamInvitation.aggregate([
      {
        $match: {
          teamId: { $in: teamIds },
          revokedAt: { $exists: false },
          acceptedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        },
      },
      { $group: { _id: "$teamId", pendingInvites: { $sum: 1 } } },
    ]);

    const inviteMap = Object.fromEntries(
      inviteAgg.map((i) => [
        String(i._id),
        { pendingInvites: i.pendingInvites || 0 },
      ])
    );

    const users = await User.find({
      _id: { $in: teams.map((t) => t.user).filter(Boolean) },
    })
      .select("_id firstName lastName username email")
      .lean();
    const ownerMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const rows = teams.map((t) => {
      const key = String(t._id);
      const memberStats = memberMap[key] || {
        activeMembers: 0,
        pendingMembers: 0,
        totalMembers: 0,
      };
      const inviteStats = inviteMap[key] || { pendingInvites: 0 };
      const owner = t.user ? ownerMap[String(t.user)] : null;

      return {
        _id: String(t._id),
        teamName: t.teamName,
        teamSlug: t.teamSlug,
        logo: t.logo || null,
        owner: owner
          ? {
              _id: String(owner._id),
              name:
                [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
                owner.username ||
                owner.email,
            }
          : null,
        createdAt: t.createdAt,
        ...memberStats,
        ...inviteStats,
      };
    });

    return NextResponse.json({
      teams: rows,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("GET /api/admin/teams failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
