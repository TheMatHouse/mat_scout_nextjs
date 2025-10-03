// app/api/users/[username]/family/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel"; // <- ensure this is the correct model name in your app

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

  // find the parent user by username to resolve their _id
  const parent = await User.findOne({ username }, { _id: 1 }).lean();
  if (!parent) return json({ error: "User not found" }, 404);

  // fetch their family members
  const members = await FamilyMember.find(
    { userId: parent._id },
    {
      _id: 1,
      username: 1,
      firstName: 1,
      lastName: 1,
      avatar: 1,
      avatarType: 1,
      googleAvatar: 1,
      facebookAvatar: 1,
    }
  )
    .sort({ createdAt: -1 })
    .lean();

  return json({
    results: members.map((m) => ({
      id: String(m._id),
      username: m.username,
      firstName: m.firstName,
      lastName: m.lastName,
      avatar: m.avatar,
      avatarType: m.avatarType,
      googleAvatar: m.googleAvatar,
      facebookAvatar: m.facebookAvatar,
    })),
  });
}
