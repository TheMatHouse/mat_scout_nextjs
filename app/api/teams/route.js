// app/api/teams/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { getMyTeams } from "@/lib/teams/getMyTeams";
import Team from "@/models/teamModel";

/* ------------------------- helpers ------------------------- */
function normText(s) {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function rxContains(s) {
  return new RegExp(escapeRegex(s), "i");
}
function rxEqualsCaseI(s) {
  return new RegExp(`^${escapeRegex(s)}$`, "i");
}
function buildTokenOR(fields, token) {
  const rx = rxContains(token);
  return { $or: fields.map((f) => ({ [f]: rx })) };
}
/** Build a country-agnostic filter from query params. */
function buildFilter({ name, city, state, country }) {
  const and = [];

  const nameNorm = normText(name);
  if (nameNorm) {
    const tokens = nameNorm.split(" ").filter(Boolean);
    const nameFields = ["teamName", "teamSlug"];
    tokens.forEach((t) => and.push(buildTokenOR(nameFields, t)));
  }

  const cityNorm = normText(city);
  if (cityNorm) and.push({ city: rxContains(cityNorm) });

  const stateNorm = normText(state);
  if (stateNorm) {
    const rx = rxContains(stateNorm);
    and.push({
      $or: [
        { state: rx },
        { stateCode: rx },
        { region: rx },
        { regionCode: rx },
      ],
    });
  }

  const countryCode = normText(country).toUpperCase();
  if (/^[A-Z]{3}$/.test(countryCode)) {
    and.push({
      $or: [{ countryCode }, { country: rxEqualsCaseI(countryCode) }],
    });
  }

  return and.length ? { $and: and } : {};
}

// Slug rules to match your UI (underscores supported)
const SLUG_RX = /^[a-z0-9_ -]+$/i;
function toUiSlug(str = "") {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9_]+/g, "_") // keep underscores; collapse others to "_"
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

async function ensureUniqueSlug(baseSlug) {
  const base = toUiSlug(baseSlug) || "team";
  // case-insensitive existence check
  const exists = async (s) =>
    !!(await Team.exists({ teamSlug: rxEqualsCaseI(s) }));
  if (!(await exists(base))) return base;

  // add _2, _3, ...
  let n = 2;
  while (await exists(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/* ------------------------- GET: list/search (unchanged) ------------------------- */
export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const city = url.searchParams.get("city") || "";
  const state = url.searchParams.get("state") || "";
  const country = url.searchParams.get("country") || "";

  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  let limit = Math.max(0, parseInt(url.searchParams.get("limit") || "12", 10));

  const hasFilters = Boolean(
    normText(name) || normText(city) || normText(state) || normText(country)
  );

  // Mode A: "My Teams" (used by /teams/mine) → limit=0 and NO filters
  if (!hasFilters && limit === 0) {
    const me = await getCurrentUserFromCookies().catch(() => null);
    const myTeams = me?._id ? await getMyTeams(me._id) : [];
    return NextResponse.json(
      { myTeams },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Mode B: Public listing/search (used by /teams/find)
  const filter = buildFilter({ name, city, state, country });

  if (hasFilters && limit === 0) limit = 12;

  const total = await Team.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / (limit || 1)));

  const teams = await Team.find(filter)
    .select(
      "teamName teamSlug logoURL city state stateCode region regionCode country countryCode"
    )
    .sort({ teamName: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json(
    { teams, page, limit, total, totalPages },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* ------------------------- POST: create team (updated) ------------------------- */
export async function POST(req) {
  try {
    await connectDB();

    const user = await getCurrentUserFromCookies().catch(() => null);
    if (!user?._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      /* ignore bad JSON */
    }

    const {
      teamName,
      teamSlug: clientSlug,
      logoURL = null,
      email = "",
      phone = "",
      address = "",
      address2 = "",
      city = "",
      state = "",
      postalCode = "",
      country = "",
      countryCode = "",
      stateCode = "",
      region = "",
      regionCode = "",
      info = "",
    } = body || {};

    // Validate name
    if (!teamName || !String(teamName).trim()) {
      return NextResponse.json(
        { message: "Team name is required." },
        { status: 400 }
      );
    }

    // Decide slug (prefer the client-provided slug; fall back to name)
    let desired = clientSlug ? String(clientSlug) : String(teamName);
    desired = toUiSlug(desired);

    // Basic format check so users get instant feedback
    if (!desired || desired.length < 3 || !SLUG_RX.test(desired)) {
      return NextResponse.json(
        {
          message:
            "Please provide a URL slug of at least 3 characters using only letters, numbers, or underscores.",
        },
        { status: 400 }
      );
    }

    // Enforce uniqueness case-insensitively and suffix if needed
    const finalSlug = await ensureUniqueSlug(desired);

    // Create document
    const created = await Team.create({
      teamName: String(teamName).trim(),
      teamSlug: finalSlug,
      user: user._id, // owner
      logoURL,
      email,
      phone,
      address,
      address2,
      city,
      state,
      postalCode,
      country,
      countryCode,
      stateCode,
      region,
      regionCode,
      info,
    });

    const team = await Team.findById(created._id).lean();

    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    // Duplicate key (unique index on teamSlug, etc.)
    if (err?.code === 11000) {
      const fields = Object.keys(err?.keyPattern || {});
      const field = fields[0] || "field";
      return NextResponse.json(
        { message: `A team with that ${field} already exists.` },
        { status: 409 }
      );
    }

    // Mongoose validation error (surface first path’s message)
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors || {})[0];
      return NextResponse.json(
        { message: first?.message || "Validation error." },
        { status: 400 }
      );
    }

    console.error("POST /api/teams error:", err);
    return NextResponse.json(
      {
        message:
          typeof err?.message === "string"
            ? err.message
            : "Server error creating team",
      },
      { status: 500 }
    );
  }
}
