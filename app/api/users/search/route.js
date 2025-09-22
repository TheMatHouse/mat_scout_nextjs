// app/api/users/search/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";
import FamilyMember from "@/models/familyMemberModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// exclude family rows by checking presence (no Mongo cast to ObjectId)
const excludeFamilyRows = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((s) => !s.familyMemberId);

const onlyFamilyRows = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((s) => !!s.familyMemberId);

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const firstName = (searchParams.get("firstName") || "").trim();
    const lastName = (searchParams.get("lastName") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    const style = (searchParams.get("style") || "").trim(); // styleName
    const sort = (searchParams.get("sort") || "recent").trim(); // 'recent' | 'alpha'
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "24", 10), 1),
      60
    );
    const skip = (page - 1) * limit;

    // ---------- Build base filters ----------
    // USERS (public)
    const userFilter = { allowPublic: true };
    if (q) {
      userFilter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }
    if (firstName) userFilter.firstName = { $regex: firstName, $options: "i" };
    if (lastName) userFilter.lastName = { $regex: lastName, $options: "i" };

    if (city) {
      userFilter.$and ??= [];
      userFilter.$and.push({
        $or: [
          { "address.city": { $regex: city, $options: "i" } },
          { city: { $regex: city, $options: "i" } },
        ],
      });
    }
    if (state) {
      userFilter.$and ??= [];
      userFilter.$and.push({
        $or: [
          { "address.state": { $regex: `^${state}$`, $options: "i" } },
          { state: { $regex: `^${state}$`, $options: "i" } },
        ],
      });
    }

    // FAMILY MEMBERS (public)
    const famFilter = { allowPublic: true };
    if (q) {
      famFilter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } }, // allow direct handle search
      ];
    }
    if (firstName) famFilter.firstName = { $regex: firstName, $options: "i" };
    if (lastName) famFilter.lastName = { $regex: lastName, $options: "i" };
    if (city) {
      famFilter.$and ??= [];
      famFilter.$and.push({
        $or: [
          { "address.city": { $regex: city, $options: "i" } },
          { city: { $regex: city, $options: "i" } },
        ],
      });
    }
    if (state) {
      famFilter.$and ??= [];
      famFilter.$and.push({
        $or: [
          { "address.state": { $regex: `^${state}$`, $options: "i" } },
          { state: { $regex: `^${state}$`, $options: "i" } },
        ],
      });
    }

    // ---------- Style prefilter (applies to both) ----------
    if (style) {
      const raw = await UserStyle.find(
        { styleName: { $regex: `^${style}$`, $options: "i" } },
        { userId: 1, familyMemberId: 1, styleName: 1 }
      ).lean();

      const userRows = excludeFamilyRows(raw);
      const famRows = onlyFamilyRows(raw);

      const userIdSet = new Set(userRows.map((r) => String(r.userId)));
      const famIdSet = new Set(famRows.map((r) => String(r.familyMemberId)));

      if (userIdSet.size === 0 && famIdSet.size === 0) {
        return json({ page, limit, total: 0, count: 0, users: [] });
      }

      userFilter._id = { $in: Array.from(userIdSet) };
      famFilter._id = { $in: Array.from(famIdSet) };
    }

    // ---------- Fetch both sets (unpaginated) ----------
    const [usersRaw, familiesRaw] = await Promise.all([
      User.find(userFilter, {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        avatarType: 1,
        avatar: 1,
        googleAvatar: 1,
        facebookAvatar: 1,
        "address.city": 1,
        "address.state": 1,
        city: 1,
        state: 1,
        createdAt: 1,
      }).lean(),
      FamilyMember.find(famFilter, {
        _id: 1,
        userId: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        avatar: 1,
        "address.city": 1,
        "address.state": 1,
        city: 1,
        state: 1,
        createdAt: 1,
      }).lean(),
    ]);

    // Map parent usernames for family profile links
    const parentIdSet = new Set(
      familiesRaw.map((f) => String(f.userId)).filter(Boolean)
    );
    const parents = parentIdSet.size
      ? await User.find(
          { _id: { $in: Array.from(parentIdSet) } },
          { _id: 1, username: 1 }
        ).lean()
      : [];
    const parentUsernameById = new Map(
      parents.map((p) => [String(p._id), p.username])
    );

    // Combine
    const combined = [
      ...usersRaw.map((u) => ({
        type: "user",
        _id: String(u._id),
        username: u.username,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        city: (u.city ?? u.address?.city) || "",
        state: (u.state ?? u.address?.state) || "",
        avatarType: u.avatarType,
        avatar: u.avatar,
        googleAvatar: u.googleAvatar,
        facebookAvatar: u.facebookAvatar,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        profileUrl: `/${u.username}`,
      })),
      ...familiesRaw.map((f) => {
        const parentUsername = parentUsernameById.get(String(f.userId)) || "";
        const famUsername = f.username || "";
        return {
          type: "family",
          _id: String(f._id),
          username: famUsername, // child's handle
          parentUserId: String(f.userId || ""),
          parentUsername, // for optional display
          firstName: f.firstName || "",
          lastName: f.lastName || "",
          city: (f.city ?? f.address?.city) || "",
          state: (f.state ?? f.address?.state) || "",
          avatar: f.avatar || "",
          createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : null,
          profileUrl: famUsername ? `/family/${famUsername}` : "",
        };
      }),
    ];

    // Sort
    combined.sort((a, b) => {
      if (sort === "alpha") {
        const ak = (a.lastName || "").toLowerCase();
        const bk = (b.lastName || "").toLowerCase();
        if (ak !== bk) return ak < bk ? -1 : 1;
        const an = (a.firstName || "").toLowerCase();
        const bn = (b.firstName || "").toLowerCase();
        if (an !== bn) return an < bn ? -1 : 1;
        return (a.username || "").toLowerCase() <
          (b.username || "").toLowerCase()
          ? -1
          : 1;
      }
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });

    const total = combined.length;
    const pageItems = combined.slice(skip, skip + limit);

    // Style badges for the current page
    const pageUserIds = pageItems
      .filter((x) => x.type === "user")
      .map((x) => x._id);
    const pageFamilyIds = pageItems
      .filter((x) => x.type === "family")
      .map((x) => x._id);

    const [userStylesRaw, famStylesRaw] = await Promise.all([
      pageUserIds.length
        ? UserStyle.find(
            { userId: { $in: pageUserIds } },
            { userId: 1, familyMemberId: 1, styleName: 1 }
          ).lean()
        : [],
      pageFamilyIds.length
        ? UserStyle.find(
            { familyMemberId: { $in: pageFamilyIds } },
            { userId: 1, familyMemberId: 1, styleName: 1 }
          ).lean()
        : [],
    ]);

    const userStyleBadges = excludeFamilyRows(userStylesRaw).reduce(
      (acc, s) => {
        const k = String(s.userId);
        acc[k] ??= [];
        if (s.styleName && !acc[k].includes(s.styleName))
          acc[k].push(s.styleName);
        return acc;
      },
      {}
    );

    const familyStyleBadges = onlyFamilyRows(famStylesRaw).reduce((acc, s) => {
      const k = String(s.familyMemberId);
      acc[k] ??= [];
      if (s.styleName && !acc[k].includes(s.styleName))
        acc[k].push(s.styleName);
      return acc;
    }, {});

    const items = pageItems.map((x) => {
      const base = { ...x };
      base.styles =
        x.type === "user"
          ? userStyleBadges[x._id] || []
          : familyStyleBadges[x._id] || [];
      return base;
    });

    return json({ page, limit, total, count: items.length, users: items });
  } catch (err) {
    console.error("GET /api/users/search error:", err);
    return json({ error: "Server error" }, 500);
  }
}
