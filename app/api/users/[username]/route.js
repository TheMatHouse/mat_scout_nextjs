// app/api/users/[username]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
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

// Small helper to send JSON
function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/* ---------------- GET ---------------- */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { username } = await params; // Next 15: must await
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    // 1) Base user (only fields the profile needs)
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
        // include gender/city/state if you show them on the card:
        gender: 1,
        city: 1,
        state: 1,
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

    // 4) Teams — fetch memberships by userId, then filter out family rows in JS
    let teams = [];
    try {
      const membershipsAll = await TeamMember.find(
        { userId: uid },
        { _id: 1, role: 1, teamId: 1, team: 1, familyMemberId: 1 }
      ).lean();

      // Exclude family rows (handles undefined/null/empty-string safely)
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
              // role: m.role, // add back if you want to display badges
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
    console.error("GET /api/users/[username] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------- PATCH ----------------
   Update profile fields and notify followers based on settings.
-------------------------------------------------------------- */
export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const { username } = (await params) || {};
    if (!username) return json({ error: "Missing username" }, 400);

    const viewer = await getCurrentUser().catch(() => null);
    if (!viewer) return json({ error: "Unauthorized" }, 401);

    // Only the owner (or admin) can edit
    const target = await User.findOne({ username }).lean();
    if (!target) return json({ error: "User not found" }, 404);

    const isOwner = String(viewer._id) === String(target._id);
    const isAdmin = !!viewer.isAdmin;
    if (!(isOwner || isAdmin)) return json({ error: "Forbidden" }, 403);

    // Parse body
    let body = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // Allowed keys (add or remove as fits your schema/UI)
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

    // Load doc for diff, then apply updates
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
      city: doc.city,
      state: doc.state,
      bio: doc.bio,
    };

    // Compute changed keys
    const changed = Object.keys(after).filter((k) => {
      // shallow compare enough for primitives/strings we use here
      return `${before[k] ?? ""}` !== `${after[k] ?? ""}`;
    });

    // Partition avatar vs. profile fields
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

    // Fire notifications to followers based on what changed
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

    // Respond with the same shape as GET (fresh minimal fields; styles/teams can be reloaded client-side if needed)
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
