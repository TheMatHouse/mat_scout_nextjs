// app/api/users/[username]/followers/route.js
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
  const skip = (page - 1) * limit;

  const filter = { targetType: "user", followingUserId: target._id };

  const [edges, total] = await Promise.all([
    Follow.find(filter, { followerId: 1 })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "followerId",
        select:
          "username displayName firstName lastName avatarUrl avatar googleAvatar facebookAvatar",
      })
      .lean(),
    Follow.countDocuments(filter),
  ]);

  // Modal expects items like { follower: <User> }
  const results = edges
    .map((e) => e?.followerId)
    .filter(Boolean)
    .map((u) => ({ follower: u }));

  return json({ ok: true, page, limit, total, results });
}
