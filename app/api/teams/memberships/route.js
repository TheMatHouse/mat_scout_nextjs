// app/api/teams/memberships/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    // Default: only active roles. Pass ?activeOnly=0 to get all (including pending).
    const activeOnly = url.searchParams.get("activeOnly") !== "0";

    // Your app uses role: "manager" | "coach" | "member" | "pending"
    const ACTIVE_ROLES = ["manager", "coach", "member"];

    const query = { userId: me._id };
    if (activeOnly) query.role = { $in: ACTIVE_ROLES };

    const memberships = await TeamMember.find(query)
      .select("_id teamId userId role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const teamIds = [
      ...new Set(memberships.map((m) => String(m.teamId)).filter(Boolean)),
    ];

    const teams = teamIds.length
      ? await Team.find({ _id: { $in: teamIds } })
          .select("_id teamName teamSlug logo")
          .lean()
      : [];

    const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));

    const result = memberships.map((m) => ({
      _id: String(m._id),
      role: m.role,
      teamId: String(m.teamId),
      createdAt: m.createdAt,
      team: teamMap[String(m.teamId)] || null,
    }));

    return NextResponse.json({
      count: result.length,
      memberships: result,
    });
  } catch (err) {
    console.error("GET /api/teams/memberships failed:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
