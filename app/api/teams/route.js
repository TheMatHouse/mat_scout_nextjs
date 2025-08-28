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
    .replace(/\u00a0/g, " ") // non-breaking space → normal
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

  // --- Name: split into tokens; each token must match name or slug
  const nameNorm = normText(name);
  if (nameNorm) {
    const tokens = nameNorm.split(" ").filter(Boolean);
    const nameFields = ["teamName", "teamSlug"];
    tokens.forEach((t) => and.push(buildTokenOR(nameFields, t)));
  }

  // --- City: substring, case-insensitive
  const cityNorm = normText(city);
  if (cityNorm) and.push({ city: rxContains(cityNorm) });

  // --- State/Region: country-agnostic; match name or code across common fields
  const stateNorm = normText(state);
  if (stateNorm) {
    const rx = rxContains(stateNorm);
    and.push({
      $or: [
        { state: rx }, // free-text state name stored here
        { stateCode: rx }, // optional short code if you store it
        { region: rx }, // some orgs prefer "region"
        { regionCode: rx }, // optional short code
      ],
    });
  }

  // --- Country: ISO-3 code ONLY (e.g., USA, MEX, CAN, GBR). Ignore anything else.
  const countryCode = normText(country).toUpperCase();
  if (/^[A-Z]{3}$/.test(countryCode)) {
    and.push({
      $or: [
        { countryCode: countryCode }, // canonical (recommended)
        { country: rxEqualsCaseI(countryCode) }, // legacy exact (e.g., "USA")
      ],
    });
  }

  return and.length ? { $and: and } : {};
}

/* ------------------------- handler ------------------------- */
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

  // If filters present and limit=0, default to a safe page size
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
