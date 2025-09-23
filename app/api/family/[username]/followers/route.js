// app/api/family/[username]/followers/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import FamilyMember from "@/models/familyMemberModel";
import Follow from "@/models/followModel";

export async function GET(request, { params }) {
  const { username } = await params; // Next.js 15+: await params
  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  const skip = (page - 1) * limit;

  const fam = await FamilyMember.findOne({ username })
    .select("_id username")
    .lean();
  if (!fam) {
    return NextResponse.json(
      { error: "Family member not found" },
      { status: 404 }
    );
  }

  const [total, rows] = await Promise.all([
    Follow.countDocuments({
      targetType: "family",
      followingFamilyId: fam._id,
    }),
    Follow.find({
      targetType: "family",
      followingFamilyId: fam._id,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("followerId", "username displayName avatar avatarUrl")
      .lean(),
  ]);

  const results = rows.map((r) => ({
    id: String(r._id),
    follower: r.followerId
      ? {
          id: String(r.followerId._id),
          username: r.followerId.username,
          displayName: r.followerId.displayName,
          // prefer avatarUrl if present, else avatar
          avatarUrl: r.followerId.avatarUrl || r.followerId.avatar || null,
        }
      : null,
    followedAt: r.createdAt,
  }));

  return NextResponse.json({
    username,
    total,
    page,
    limit,
    results,
  });
}
