// app/api/teams/mine/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
let TeamMember;
try {
  TeamMember = (await import("@/models/teamMemberModel")).default;
} catch {
  // ok if your project doesn't use a TeamMember model
}

function noStore(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
    },
  });
}

export async function GET() {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me?._id) return noStore({ myTeams: [] });

    const oid = new mongoose.Types.ObjectId(String(me._id));
    const sid = String(me._id);

    // --- A) Teams you OWN (your schema uses Team.user; include common variants too)
    const ownerFields = [
      "user",
      "userId",
      "createdBy",
      "owner",
      "ownerId",
      "ownerID",
      "userID",
      "created_by",
    ];

    const directOrs = [];
    for (const f of ownerFields) {
      directOrs.push({ [f]: oid }, { [f]: sid });
    }
    const exprOrs = ownerFields.map((f) => ({
      $expr: { $eq: [{ $toString: `$${f}` }, sid] },
    }));

    const ownedTeams = await Team.find(
      { $or: [...directOrs, ...exprOrs] },
      {
        _id: 1,
        teamSlug: 1,
        teamName: 1,
        logoURL: 1,
        city: 1,
        state: 1,
        country: 1,
      }
    ).lean();

    const owned = ownedTeams.map((t) => ({
      _id: String(t._id),
      teamSlug: t.teamSlug,
      teamName: t.teamName,
      logoURL: t.logoURL,
      city: t.city,
      state: t.state,
      country: t.country,
      role: "owner",
    }));

    // --- B) Teams you belong to via TeamMember
    let member = [];
    if (TeamMember) {
      const rows = await TeamMember.find(
        {
          $or: [{ user: oid }, { user: sid }, { userId: oid }, { userId: sid }],
        },
        { team: 1, teamId: 1, role: 1 }
      ).lean();

      const teamIds = Array.from(
        new Set(rows.map((r) => String(r.team ?? r.teamId)).filter(Boolean))
      );

      if (teamIds.length) {
        const teams = await Team.find(
          {
            _id: { $in: teamIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
          {
            _id: 1,
            teamSlug: 1,
            teamName: 1,
            logoURL: 1,
            city: 1,
            state: 1,
            country: 1,
          }
        ).lean();

        const roleByTeam = new Map(
          rows.map((r) => [String(r.team ?? r.teamId), r.role || "member"])
        );

        member = teams.map((t) => ({
          _id: String(t._id),
          teamSlug: t.teamSlug,
          teamName: t.teamName,
          logoURL: t.logoURL,
          city: t.city,
          state: t.state,
          country: t.country,
          role: roleByTeam.get(String(t._id)) || "member",
        }));
      }
    }

    // --- C) Union + de-dupe by slug, prefer item that has a role
    const bySlug = new Map();
    for (const t of [...owned, ...member]) {
      const key = t.teamSlug || t._id;
      const cur = bySlug.get(key);
      if (!cur || (!cur.role && t.role)) bySlug.set(key, t);
    }

    const myTeams = Array.from(bySlug.values()).sort((a, b) =>
      (a.teamName || "").localeCompare(b.teamName || "")
    );

    return noStore({ myTeams });
  } catch (err) {
    console.error("[GET /api/teams/mine] error:", err);
    return noStore({ myTeams: [] }, 200);
  }
}
