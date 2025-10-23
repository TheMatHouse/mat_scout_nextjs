// app/api/users/[username]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import matchReport from "@/models/matchReportModel"; // <-- add this import
import { notifyFollowers } from "@/lib/notify-followers";
import { getCurrentUser } from "@/lib/auth-server";

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

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// escape for RegExp building
function esc(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------- GET ---------------- */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { username } = await params; // Next 15: await params
    if (!username) return json({ error: "Missing username" }, 400);

    // Case-insensitive lookup to avoid 404s due to casing
    const userDoc = await User.findOne(
      { username: new RegExp(`^${esc(username)}$`, "i") },
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
        gender: 1,
        bio: 1,
        city: 1,
        state: 1,
      }
    ).lean();

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const uname = userDoc.username; // canonical casing from DB
    const uid = userDoc._id;
    const origin = new URL(req.url).origin;

    // who is viewing?
    let viewer = null;
    try {
      viewer = await getCurrentUser();
    } catch {
      viewer = null;
    }
    const isOwner = viewer && String(viewer._id) === String(uid);

    // forward cookies to child routes (for styles fetch only)
    const cookie = req.headers.get("cookie") ?? "";
    const commonInit = { cache: "no-store", headers: { cookie } };

    // 2) Styles (kept via HTTP since we don't have your style model handy)
    let userStyles = [];
    try {
      const sRes = await fetch(
        `${origin}/api/users/${encodeURIComponent(uname)}/styles`,
        commonInit
      );
      if (sRes.ok) {
        const sJson = await sRes.json().catch(() => null);
        userStyles = extractStyles(sJson).map(normalizeStyleName);
      } else if (sRes.status !== 404) {
        await sRes.text().catch(() => "");
      }
    } catch (e) {
      console.warn("[users/:username] styles fetch failed:", e);
    }

    // 3) Match reports — query DB directly (no HTTP fetch)
    let matchReports = [];
    try {
      const q = {
        athleteId: uid,
        athleteType: "user",
      };
      if (!isOwner) {
        q.isPublic = true;
      }

      matchReports = await matchReport
        .find(q, {
          // select only fields the client needs
          _id: 1,
          athleteId: 1,
          athleteType: 1,
          createdByName: 1,
          createdById: 1,
          matchType: 1,
          eventName: 1,
          matchDate: 1,
          myRank: 1,
          opponentRank: 1,
          opponentName: 1,
          division: 1,
          weightCategory: 1,
          weightItemId: 1,
          weightLabel: 1,
          weightUnit: 1,
          opponentClub: 1,
          opponentCountry: 1,
          opponentGrip: 1,
          opponentAttacks: 1,
          opponentAttackNotes: 1,
          athleteAttacks: 1,
          athleteAttackNotes: 1,
          result: 1,
          score: 1,
          video: 1,
          isPublic: 1,
          createdAt: 1,
          updatedAt: 1,
          style: 1, // keep style id if present
        })
        .sort({ matchDate: -1 })
        .lean();
    } catch (e) {
      console.warn("[users/:username] match reports DB query failed:", e);
      matchReports = [];
    }

    // 4) Teams — filter out family-linked memberships
    let teams = [];
    try {
      const membershipsAll = await TeamMember.find(
        { userId: uid },
        { _id: 1, role: 1, teamId: 1, team: 1, familyMemberId: 1 }
      ).lean();

      const memberships = (membershipsAll || []).filter(
        (m) => !(m.familyMemberId && String(m.familyMemberId).trim())
      );

      const teamIds = memberships
        .map((m) => m.teamId || m.team)
        .filter(Boolean);

      if (teamIds.length) {
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
        teams = memberships
          .map((m) => {
            const t = byId.get(String(m.teamId || m.team));
            if (!t) return null;
            const teamName = t.teamName || t.name || "";
            const teamSlug = t.teamSlug || t.slug || "";
            const logoURL = t.logoURL || t.logoUrl || "";
            if (!teamName || !teamSlug) return null;
            return {
              _id: t._id,
              teamName,
              teamSlug,
              logoURL,
            };
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.warn("[users/:username] teams build failed:", e);
      teams = [];
    }

    return NextResponse.json({
      user: {
        ...userDoc,
        userStyles,
        matchReports,
        teams,
      },
    });
  } catch (err) {
    console.error("GET /api/users/[username] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- PATCH (unchanged from your version) ---------------- */
export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { username } = (await params) || {};
    if (!username) return json({ error: "Missing username" }, 400);

    const viewer = await getCurrentUser().catch(() => null);
    if (!viewer) return json({ error: "Unauthorized" }, 401);

    // Owner or admin can edit
    const target = await User.findOne({
      username: new RegExp(`^${esc(username)}$`, "i"),
    }).lean();
    if (!target) return json({ error: "User not found" }, 404);

    const isOwner = String(viewer._id) === String(target._id);
    const isAdmin = !!viewer.isAdmin;
    if (!(isOwner || isAdmin)) return json({ error: "Forbidden" }, 403);

    let body = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const allowed = [
      "firstName",
      "lastName",
      "allowPublic",
      "avatarType",
      "avatar",
      "googleAvatar",
      "facebookAvatar",
      "city",
      "state",
      "bio",
    ];

    const updates = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        updates[k] = body[k];
      }
    }
    if (Object.keys(updates).length === 0) {
      return json({ error: "No valid fields to update" }, 400);
    }

    const doc = await User.findById(target._id);
    if (!doc) return json({ error: "User not found" }, 404);

    const before = {
      firstName: doc.firstName,
      lastName: doc.lastName,
      allowPublic: doc.allowPublic,
      avatarType: doc.avatarType,
      avatar: doc.avatar,
      googleAvatar: doc.googleAvatar,
      facebookAvatar: doc.facebookAvatar,
      city: doc.city,
      state: doc.state,
      bio: doc.bio,
    };

    for (const [k, v] of Object.entries(updates)) {
      doc[k] = v;
    }

    await doc.save();

    const after = {
      firstName: doc.firstName,
      lastName: doc.lastName,
      allowPublic: doc.allowPublic,
      avatarType: doc.avatarType,
      avatar: doc.avatar,
      googleAvatar: doc.googleAvatar,
      facebookAvatar: doc.facebookAvatar,
      city: doc.city ?? "",
      state: doc.state ?? "",
      bio: doc.bio ?? "",
    };

    const changed = Object.keys(after).filter(
      (k) => `${before[k] ?? ""}` !== `${after[k] ?? ""}`
    );

    const avatarKeys = new Set([
      "avatarType",
      "avatar",
      "googleAvatar",
      "facebookAvatar",
    ]);
    const avatarChanged = changed.some((k) => avatarKeys.has(k));
    const profileChangedKeys = changed.filter(
      (k) => !avatarKeys.has(k) && k !== "allowPublic"
    );

    try {
      if (avatarChanged) {
        await notifyFollowers(doc._id, "followed.avatar.changed", {
          username: doc.username,
        });
      }
      if (profileChangedKeys.length > 0) {
        await notifyFollowers(doc._id, "followed.profile.updated", {
          username: doc.username,
          fields: profileChangedKeys,
        });
      }
    } catch (e) {
      console.warn("[notifyFollowers] profile/avatar update fanout failed:", e);
    }

    return json({
      user: {
        _id: doc._id,
        username: doc.username,
        firstName: doc.firstName,
        lastName: doc.lastName,
        allowPublic: doc.allowPublic,
        avatarType: doc.avatarType,
        avatar: doc.avatar,
        googleAvatar: doc.googleAvatar,
        facebookAvatar: doc.facebookAvatar,
        city: doc.city ?? "",
        state: doc.state ?? "",
        bio: doc.bio ?? "",
      },
      updated: changed,
    });
  } catch (err) {
    return json({ error: "Server error" }, 500);
  }
}
