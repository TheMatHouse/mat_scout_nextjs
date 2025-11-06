// app/api/teams/[slug]/managers/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

/**
 * GET /api/teams/[slug]/managers
 * Returns a list of managers for the given team (from TeamMember collection).
 * Access: team owner OR any active team member.
 */
export async function GET(_req, { params }) {
  try {
    const { slug } = await params; // Next 15 awaited params

    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Your Team model uses teamSlug
    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json(
        { ok: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Must be owner or an active member to view managers
    const isOwner = String(team.user) === String(user._id);
    let isMember = false;

    if (!isOwner) {
      const membership = await TeamMember.findOne({
        teamId: team._id,
        userId: user._id,
        // allow either explicit active or missing status
        $or: [{ status: "active" }, { status: { $exists: false } }],
      })
        .select("_id")
        .lean();

      isMember = Boolean(membership);
    }

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Find current managers (lowercase role per your DB)
    const managers = await TeamMember.find({
      teamId: team._id,
      role: "manager",
      $or: [{ status: "active" }, { status: { $exists: false } }],
    })
      .select("_id userId role")
      .populate({
        path: "userId",
        select: "_id firstName lastName username email avatarUrl photoURL",
      })
      .lean();

    // Shape fields into plain strings for React safety
    const shaped = managers.map((m) => {
      const u = m.userId || {};
      const nameParts = [u.firstName, u.lastName].filter(Boolean);
      const fallbackName = u.username || "Unknown";
      const name =
        (nameParts.length ? nameParts.join(" ") : fallbackName) || "Unknown";

      return {
        teamMemberId: String(m._id),
        userId: String(u._id || m.userId), // string id, not object
        name: String(name),
        email: u.email ? String(u.email) : "",
        avatarUrl: u.avatarUrl
          ? String(u.avatarUrl)
          : u.photoURL
          ? String(u.photoURL)
          : null,
        role: "manager",
      };
    });

    // Optional: exclude the current owner if they also happen to have a manager row
    const filtered = shaped.filter((m) => m.userId !== String(team.user));

    return NextResponse.json({ ok: true, managers: filtered }, { status: 200 });
  } catch (err) {
    console.error("GET /api/teams/[slug]/managers error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
