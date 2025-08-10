// app/api/admin/users/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";

export async function GET(_req, { params }) {
  await connectDB();
  const me = await getCurrentUser();
  if (!me || !me.isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const user = await User.findById(id).lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const family = await FamilyMember.find({ userId: id }).lean();

  const memberships = await TeamMember.find({ userId: id })
    .populate({ path: "teamId", model: Team, select: "teamName teamSlug" })
    .lean();

  const matchReportsCount = Array.isArray(user.matchReports)
    ? user.matchReports.length
    : 0;
  const scoutingReportsCount = Array.isArray(user.scoutingReports)
    ? user.scoutingReports.length
    : 0;

  return NextResponse.json({
    user,
    family,
    memberships: memberships.map((m) => ({
      _id: m._id,
      role: m.role,
      team: m.teamId
        ? {
            _id: m.teamId._id,
            name: m.teamId.teamName,
            slug: m.teamId.teamSlug,
          }
        : null,
      createdAt: m.createdAt,
    })),
    stats: {
      matchReportsCount,
      scoutingReportsCount,
    },
  });
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me || !me.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; // <-- await is required in Next 15+
    const body = await req.json();

    const allowed = {};
    const setIfString = (key, normalize) => {
      if (typeof body[key] === "string") {
        allowed[key] = normalize ? normalize(body[key]) : body[key];
      }
    };

    setIfString("firstName", (s) => s.trim());
    setIfString("lastName", (s) => s.trim());
    setIfString("email", (s) => s.trim().toLowerCase());
    setIfString("username", (s) => s.trim().toLowerCase());
    setIfString("city", (s) => s.trim());
    setIfString("state", (s) => s.trim());
    setIfString("country", (s) => s.trim());

    if (typeof body.verified === "boolean") allowed.verified = body.verified;
    if (typeof body.allowPublic === "boolean")
      allowed.allowPublic = body.allowPublic;

    if (typeof body.gender === "string") {
      const ok = ["male", "female", "not specified"];
      allowed.gender = ok.includes(body.gender) ? body.gender : "not specified";
    }

    const updated = await User.findByIdAndUpdate(id, allowed, {
      new: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("Admin PATCH user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
