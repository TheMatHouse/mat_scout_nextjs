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

export async function GET(_req, { params }) {
  await connectDB();
  const { username } = await params;

  const target = await User.findOne({ username }, { _id: 1 }).lean();
  if (!target) return json({ error: "User not found" }, 404);

  // Followers = people whose followerId -> target._id (they follow the target)
  const edges = await Follow.find(
    { followingId: target._id },
    { followerId: 1 }
  ).lean();
  const ids = edges.map((e) => e.followerId).filter(Boolean);

  if (!ids.length) return json({ users: [] });

  const users = await User.find(
    { _id: { $in: ids } },
    {
      _id: 1,
      username: 1,
      firstName: 1,
      lastName: 1,
      avatarType: 1,
      avatar: 1,
      googleAvatar: 1,
      facebookAvatar: 1,
    }
  )
    .sort({ createdAt: -1 })
    .lean();

  return json({ users });
}
