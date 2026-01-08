// app/api/admin/teams/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import User from "@/models/userModel";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "20", 10), 1);
    const q = (searchParams.get("q") || "").trim();

    const filter = {};
    if (q) {
      filter.$or = [
        { teamName: { $regex: q, $options: "i" } },
        { teamSlug: { $regex: q, $options: "i" } },
      ];
    }

    const projection = {
      teamName: 1,
      teamSlug: 1,
      user: 1,
      createdAt: 1,
      logoURL: 1,
      logoUrl: 1,
      logo: 1,
    };

    const [total, teams] = await Promise.all([
      Team.countDocuments(filter),
      Team.find(filter)
        .select(projection)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const teamIds = teams.map((t) => t._id);
    const ownerIds = teams.map((t) => t.user).filter(Boolean);

    const [membersByTeam, ownerUsers] = await Promise.all([
      TeamMember.aggregate([
        { $match: { teamId: { $in: teamIds } } },
        {
          $group: {
            _id: "$teamId",
            active: {
              $sum: {
                $cond: [{ $ne: ["$role", "pending"] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$role", "pending"] }, 1, 0],
              },
            },
          },
        },
      ]),
      ownerIds.length
        ? User.find({ _id: { $in: ownerIds } })
            .select("firstName lastName username")
            .lean()
        : [],
    ]);

    const ownersById = new Map(
      ownerUsers.map((u) => [
        String(u._id),
        {
          name:
            [u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.username ||
            "User",
        },
      ])
    );

    const countsByTeamId = new Map(
      membersByTeam.map((m) => [
        String(m._id),
        {
          active: m.active || 0,
          pending: m.pending || 0,
        },
      ])
    );

    const rows = teams.map((t) => {
      const counts = countsByTeamId.get(String(t._id)) || {
        active: 0,
        pending: 0,
      };
      const owner = ownersById.get(String(t.user)) || null;

      return {
        _id: String(t._id),
        teamName: t.teamName,
        teamSlug: t.teamSlug,
        createdAt: t.createdAt,
        owner,
        logoURL:
          t.logoURL ||
          t.logoUrl ||
          (t.logo && (t.logo.secure_url || t.logo.url)) ||
          null,
        activeMembers: counts.active,
        pendingMembers: counts.pending,
        pendingInvites: 0,
      };
    });

    return NextResponse.json({ total, teams: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load teams" },
      { status: 500 }
    );
  }
}
