// app/api/users/[username]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

/* ---------------- helpers ---------------- */
const normalizeStyleName = (s) => {
  if (!s) return s;
  const styleName = s.styleName || s.name || s.style?.name || "";
  return { ...s, styleName };
};

const looksLikeStyle = (x) =>
  x &&
  typeof x === "object" &&
  (typeof x.styleName === "string" ||
    typeof x.name === "string" ||
    (x.style && typeof x.style.name === "string"));

const extractStyles = (payload) => {
  if (Array.isArray(payload) && payload.every(looksLikeStyle)) return payload;
  if (Array.isArray(payload?.styles) && payload.styles.every(looksLikeStyle))
    return payload.styles;
  if (
    Array.isArray(payload?.userStyles) &&
    payload.userStyles.every(looksLikeStyle)
  )
    return payload.userStyles;
  if (Array.isArray(payload?.data) && payload.data.every(looksLikeStyle))
    return payload.data;
  return [];
};

/* ---------------- GET ---------------- */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { username } = (await params) || {};
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    // 1) Base user (fields your profile uses)
    const userDoc = await User.findOne(
      { username },
      {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        allowPublic: 1,
        avatarType: 1,
        avatar: 1,
        googleAvatar: 1,
        facebookAvatar: 1,
      }
    ).lean();

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const uid = userDoc._id;
    const origin = new URL(req.url).origin;
    const cookie = req.headers.get("cookie") ?? "";
    const commonInit = { cache: "no-store", headers: { cookie } };

    // 2) Styles (forward cookies to child route)
    let userStyles = [];
    try {
      const sRes = await fetch(
        `${origin}/api/users/${encodeURIComponent(username)}/styles`,
        commonInit
      );
      if (sRes.ok) {
        const sJson = await sRes.json().catch(() => null);
        userStyles = extractStyles(sJson).map(normalizeStyleName);
      } else if (sRes.status !== 404) {
        await sRes.text().catch(() => "");
      }
    } catch {
      /* ignore */
    }

    // 3) Match reports (light)
    let matchReports = [];
    try {
      const mRes = await fetch(
        `${origin}/api/users/${encodeURIComponent(username)}/match-reports`,
        commonInit
      );
      if (mRes.ok) {
        const mJson = await mRes.json().catch(() => []);
        matchReports = Array.isArray(mJson) ? mJson : [];
      } else if (mRes.status !== 404) {
        await mRes.text().catch(() => "");
      }
    } catch {
      /* ignore */
    }

    // 4) Teams — only this user's memberships (exclude family), normalize fields
    let teams = [];
    try {
      // 1) get memberships for this user
      const membershipsAll = await TeamMember.find(
        { userId: uid },
        { _id: 1, role: 1, teamId: 1, team: 1, familyMemberId: 1 }
      ).lean();

      // 2) exclude family-member rows robustly (handles undefined, null, "")
      const memberships = (membershipsAll || []).filter(
        (m) => !m.familyMemberId
      );

      // 3) collect team ids from teamId (fallback to legacy team)
      const teamIds = memberships
        .map((m) => m.teamId || m.team)
        .filter(Boolean);

      if (teamIds.length) {
        // 4) fetch team docs; include both legacy and current field names
        const teamDocs = await Team.find(
          { _id: { $in: teamIds } },
          {
            _id: 1,
            name: 1,
            teamName: 1,
            slug: 1,
            teamSlug: 1,
            logoURL: 1,
            logoUrl: 1,
          }
        ).lean();

        const byId = new Map(teamDocs.map((t) => [String(t._id), t]));

        // 5) build normalized payload
        teams = memberships
          .map((m) => {
            const t = byId.get(String(m.teamId || m.team));
            if (!t) return null;

            const teamName = t.teamName || t.name || "";
            const teamSlug = t.teamSlug || t.slug || "";
            const logoURL = t.logoURL || t.logoUrl || "";

            if (!teamName || !teamSlug) return null; // require both to render link nicely

            return {
              _id: t._id,
              teamName,
              teamSlug,
              logoURL,
              // role omitted per your note, add back if you want badges:
              // role: m.role || "member",
            };
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.warn("[users/:username] teams build failed:", e);
      teams = [];
    }

    // 5) Respond
    return NextResponse.json({
      user: {
        ...userDoc,
        userStyles,
        matchReports,
        teams,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
