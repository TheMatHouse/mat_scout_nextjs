// app/api/users/[username]/following/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Follow from "@/models/followModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// NOTE: This endpoint now supports ?type=user | family | all  (default = all)
// It returns a unified shape: { ok, page, limit, total, results }
// where `results` is an array of items that look like:
//   { following: <User> }           for user targets
//   { family: <FamilyMember> }      for family targets
export async function GET(req, { params }) {
  await connectDB();

  const { username: raw } = await params;
  const username = String(raw || "")
    .trim()
    .toLowerCase();

  const target = await User.findOne({ username }, { _id: 1 }).lean();
  if (!target) return json({ error: "User not found" }, 404);

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  const type = (searchParams.get("type") || "all").toLowerCase(); // user|family|all

  const wantUsers = type === "user" || type === "all";
  const wantFamily = type === "family" || type === "all";

  const queries = [];
  const counts = [];

  if (wantUsers) {
    counts.push(
      Follow.countDocuments({ followerId: target._id, targetType: "user" })
    );
    queries.push(
      Follow.find(
        { followerId: target._id, targetType: "user" },
        { followingUserId: 1, createdAt: 1 }
      )
        .sort({ _id: -1 })
        .populate({
          path: "followingUserId",
          select:
            "username displayName firstName lastName avatarUrl avatar googleAvatar facebookAvatar avatarType",
        })
        .lean()
        .then((rows) =>
          rows
            .map((r) => r?.followingUserId)
            .filter(Boolean)
            .map((u) => ({
              kind: "user",
              createdAt: u?.createdAt || undefined,
              following: u,
            }))
        )
    );
  } else {
    counts.push(Promise.resolve(0));
    queries.push(Promise.resolve([]));
  }

  if (wantFamily) {
    counts.push(
      Follow.countDocuments({ followerId: target._id, targetType: "family" })
    );
    queries.push(
      Follow.find(
        { followerId: target._id, targetType: "family" },
        { followingFamilyId: 1, createdAt: 1 }
      )
        .sort({ _id: -1 })
        .populate({
          path: "followingFamilyId",
          // Adjust selects to match your FamilyMember schema fields
          select:
            "username displayName firstName lastName avatarUrl avatar googleAvatar facebookAvatar avatarType",
        })
        .lean()
        .then((rows) =>
          rows
            .map((r) => r?.followingFamilyId)
            .filter(Boolean)
            .map((fm) => ({
              kind: "family",
              createdAt: fm?.createdAt || undefined,
              family: fm,
            }))
        )
    );
  } else {
    counts.push(Promise.resolve(0));
    queries.push(Promise.resolve([]));
  }

  const [[userCount, familyCount], [userItems, familyItems]] =
    await Promise.all([Promise.all(counts), Promise.all(queries)]);

  const allItems = [...userItems, ...familyItems];

  // Sort newest first (fallback-safe)
  allItems.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  const total = userCount + familyCount;
  const start = (page - 1) * limit;
  const results = allItems.slice(start, start + limit);

  return json({ ok: true, page, limit, total, results });
}
