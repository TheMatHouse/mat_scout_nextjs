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

const toDateOrNull = (v) => {
  if (!v) return null;
  try {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { username } = await params;
    if (!username) return json({ error: "Missing username" }, 400);

    // 1) Fetch the family member
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
        gender: 1,
        // Include bio fields so the client can show them if present
        bio: 1, // (Editor.js blocks JSON if you store it)
        bioText: 1, // (plain text)
        // Some installs also store bioHtml; if your schema has it, uncomment:
        // bioHtml: 1,
        city: 1,
        state: 1,
        "address.city": 1,
        "address.state": 1,
        createdAt: 1,
        updatedAt: 1,
      }
    ).lean();

    if (!fam) {
      return json({ error: "Family member not found" }, 404);
    }

    // ⚠️ IMPORTANT:
    // Do NOT block with 403 here. Always return 200 and include allowPublic;
    // let the client decide whether to show details or a privacy message
    // to avoid dropping into a generic “Profile unavailable” state.

    // 2) Parent (to scope styles)
    const parent = await User.findById(fam.userId, {
      _id: 1,
      username: 1,
    }).lean();
    const parentId = parent?._id;

    // 3) Styles for THIS family member (scoped by parent userId + familyMemberId)
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

    // 4) Match reports for W/L tallies
    const matchReports =
      (await matchReport
        .find(
          {
            $or: [
              { athleteType: "family", athleteId: fam._id },
              { familyMemberId: fam._id }, // legacy shape
            ],
          },
          { _id: 1, matchType: 1, result: 1 }
        )
        .lean()) || [];

    // 5) Build response (normalize location)
    const city = fam.city ?? fam.address?.city ?? "";
    const state = fam.state ?? fam.address?.state ?? "";

    return json({
      family: {
        ...fam,
        parentUsername: parent?.username || "",
        city,
        state,
        userStyles,
        matchReports,
      },
    });
  } catch (err) {
    console.error("[family/:username] error:", err);
    return json({ error: "Server error" }, 500);
  }
}
