// app/api/users/search/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserStyle from "@/models/userStyleModel";

function json(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// helper: exclude family styles in JS (covers undefined, null, "")
const excludeFamily = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((s) => !s.familyMemberId);

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

    // Base filter: public profiles only
    const filter = { allowPublic: true };

    // Name query (q matches first/last/username)
    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }
    if (firstName) filter.firstName = { $regex: firstName, $options: "i" };
    if (lastName) filter.lastName = { $regex: lastName, $options: "i" };

    // City filter: support both address.city and city
    if (city) {
      filter.$and ??= [];
      filter.$and.push({
        $or: [
          { "address.city": { $regex: city, $options: "i" } },
          { city: { $regex: city, $options: "i" } },
        ],
      });
    }

    // State filter: support both address.state and state
    if (state) {
      // exact match (case-insensitive), but across both paths
      filter.$and ??= [];
      filter.$and.push({
        $or: [
          { "address.state": { $regex: `^${state}$`, $options: "i" } },
          { state: { $regex: `^${state}$`, $options: "i" } },
        ],
      });
    }

    // Sorting
    const sortSpec =
      sort === "alpha"
        ? { lastName: 1, firstName: 1, username: 1 }
        : { createdAt: -1, _id: -1 }; // recent first

    // --- Style prefilter (BEFORE querying users) ---
    // If style is requested, find userIds that have that style (excluding family styles),
    // then restrict the users query to those IDs.
    if (style) {
      const raw = await UserStyle.find(
        {
          styleName: { $regex: `^${style}$`, $options: "i" },
        },
        { _id: 1, userId: 1, styleName: 1, familyMemberId: 1 }
      ).lean();

      const withStyle = excludeFamily(raw);
      const userIds = Array.from(
        new Set(withStyle.map((s) => String(s.userId)))
      );

      if (userIds.length === 0) {
        // No matches; short-circuit
        return json({
          page,
          limit,
          total: 0,
          count: 0,
          users: [],
        });
      }

      // Restrict to these userIds
      filter._id = { $in: userIds };
    }

    // Query users with all filters applied
    const [users, total] = await Promise.all([
      User.find(filter, {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        avatarType: 1,
        avatar: 1,
        googleAvatar: 1,
        facebookAvatar: 1,
        // support both nested and flat location fields
        "address.city": 1,
        "address.state": 1,
        city: 1,
        state: 1,
        createdAt: 1,
      })
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    if (!users.length) {
      return json({
        page,
        limit,
        total,
        count: 0,
        users: [],
      });
    }

    // Build style badges for this page of users (exclude family in JS)
    const pageUserIds = users.map((u) => u._id);
    const rawStyles = await UserStyle.find(
      {
        userId: { $in: pageUserIds },
      },
      { _id: 1, userId: 1, styleName: 1, familyMemberId: 1 }
    ).lean();
    const flatStyles = excludeFamily(rawStyles);

    const stylesByUser = flatStyles.reduce((acc, s) => {
      const k = String(s.userId);
      acc[k] ??= [];
      if (s.styleName && !acc[k].includes(s.styleName))
        acc[k].push(s.styleName);
      return acc;
    }, {});

    // Build response payload
    const items = users.map((u) => ({
      _id: String(u._id),
      username: u.username,
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      // prefer flat city/state if present, else nested
      city: (u.city ?? u.address?.city) || "",
      state: (u.state ?? u.address?.state) || "",
      avatarType: u.avatarType,
      avatar: u.avatar,
      googleAvatar: u.googleAvatar,
      facebookAvatar: u.facebookAvatar,
      styles: stylesByUser[String(u._id)] || [],
    }));

    return json({
      page,
      limit,
      total,
      count: items.length,
      users: items,
    });
  } catch (err) {
    console.error("GET /api/users/search error:", err);
    return json({ error: "Server error" }, 500);
  }
}
