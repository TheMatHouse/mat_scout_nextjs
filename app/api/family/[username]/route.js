// app/api/family/[username]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import UserStyle from "@/models/userStyleModel";
import matchReport from "@/models/matchReportModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const normStyle = (s) => {
  if (!s) return s;
  const styleName = s.styleName || s.name || s.style?.name || "";
  return { ...s, styleName };
};

export async function GET(_req, { params }) {
  try {
    await connectDB();

    // 🔧 IMPORTANT: await params
    const { username } = await params;
    if (!username) return json({ error: "Missing username" }, 400);

    // 1) Strictly fetch FAMILY MEMBER by username
    const fam = await FamilyMember.findOne(
      { username },
      {
        _id: 1,
        userId: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        allowPublic: 1,
        avatar: 1,
        city: 1,
        state: 1,
        "address.city": 1,
        "address.state": 1,
        createdAt: 1,
        updatedAt: 1,
      }
    ).lean();

    if (!fam) {
      // No family member with this username → 404 (no fallback to users)
      return json({ error: "Family member not found" }, 404);
    }

    // Optional: honor privacy
    if (!fam.allowPublic) {
      return json({ error: "Family profile is private" }, 403);
    }

    // 2) Resolve parent (for styles scoping and friendly info)
    const parent = await User.findById(fam.userId, {
      _id: 1,
      username: 1,
    }).lean();
    const parentId = parent?._id;

    // 3) Styles for THIS family member: userId = parentId AND familyMemberId = fam._id
    let userStyles = [];
    if (parentId) {
      const raw = await UserStyle.find(
        { userId: parentId, familyMemberId: fam._id },
        {
          _id: 1,
          userId: 1,
          familyMemberId: 1,
          styleName: 1,
          name: 1,
          style: 1,
          // fields your StyleCard may use:
          currentRank: 1,
          promotions: 1,
          rank: 1,
          promotionDate: 1,
          grip: 1,
          favoriteTechnique: 1,
          createdAt: 1,
          updatedAt: 1,
        }
      )
        .sort({ createdAt: -1 })
        .lean();

      userStyles = (raw || []).map(normStyle);
    }

    // 4) Match reports for THIS family member for W/L
    const matchReports =
      (await matchReport
        .find(
          {
            $or: [
              { athleteType: "family", athleteId: fam._id },
              // tolerate older shapes:
              { familyMemberId: fam._id },
            ],
          },
          { _id: 1, matchType: 1, result: 1 }
        )
        .lean()) || [];

    // 5) Return the exact shape your FamilyProfile client expects
    return json({
      family: {
        ...fam,
        parentUsername: parent?.username || "",
        city: fam.city ?? fam.address?.city ?? "",
        state: fam.state ?? fam.address?.state ?? "",
        userStyles,
        matchReports,
      },
    });
  } catch (err) {
    console.error("[family/:username] error:", err);
    return json({ error: "Server error" }, 500);
  }
}
