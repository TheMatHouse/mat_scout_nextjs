// app/api/teams/mine/count/route.js
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
  /* ok if you don't have it */
}

function noStoreJson(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
    },
  });
}

export async function GET(req) {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me?._id) return noStoreJson({ count: 0, reason: "not_logged_in" });

    const oid = new mongoose.Types.ObjectId(String(me._id));
    const sid = String(me._id);
    const debug = req.nextUrl.searchParams.get("debug");
    const roles = ["owner", "manager", "coach", "member"];

    const idSet = new Set();
    const dbg = {
      me: sid,
      owner_hits: {}, // map of field -> [teamIds]
      memberRows: [],
      union: [],
    };

    // --- A) TEAMS YOU OWN ---------------------------------------------------
    // Try many field names + both direct and $expr (stringified) matches
    const ownerFields = [
      "createdBy",
      "userId",
      "user",
      "owner",
      "ownerId",
      "ownerID",
      "userID",
      "created_by",
    ];

    const directOrs = [];
    for (const f of ownerFields) {
      directOrs.push({ [f]: oid });
      directOrs.push({ [f]: sid });
    }

    const exprOrs = ownerFields.map((f) => ({
      $expr: { $eq: [{ $toString: `$${f}` }, sid] },
    }));

    const owners = await Team.find(
      { $or: [...directOrs, ...exprOrs] },
      Object.fromEntries([["_id", 1], ...ownerFields.map((f) => [f, 1])])
    ).lean();

    for (const t of owners) {
      const id = String(t._id);
      idSet.add(id);
      if (debug) {
        for (const f of ownerFields) {
          const v = t[f];
          if (v != null && String(v) === sid) {
            (dbg.owner_hits[f] ||= []).push(id);
          }
        }
      }
    }

    // --- B) TEAMS VIA MEMBERSHIP -------------------------------------------
    if (TeamMember) {
      const membershipRows = await TeamMember.find(
        {
          role: { $in: roles },
          $or: [{ user: oid }, { user: sid }, { userId: oid }, { userId: sid }],
          // add your acceptance filter if applicable:
          // status: "accepted",
        },
        { team: 1, teamId: 1 }
      ).lean();

      for (const m of membershipRows) {
        const teamId = m.team ?? m.teamId;
        if (teamId) {
          const id = String(teamId);
          idSet.add(id);
          if (debug) dbg.memberRows.push(id);
        }
      }
    }

    const count = idSet.size;
    const union = Array.from(idSet);
    if (debug) dbg.union = union;

    return noStoreJson(debug ? { count, ...dbg } : { count });
  } catch (err) {
    console.error("[GET /api/teams/mine/count] error:", err);
    return noStoreJson({ count: 0, error: "internal_error" }, 200);
  }
}
