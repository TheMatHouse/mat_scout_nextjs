// app/api/auth/check-username/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { sanitizeUsername, USERNAME_REGEX, RESERVED } from "@/lib/identifiers";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const raw =
    url.searchParams.get("username") ?? url.searchParams.get("u") ?? "";
  const wantDebug = url.searchParams.get("debug") === "1";
  const normalized = sanitizeUsername(raw).toLowerCase();

  if (!normalized) {
    return noStoreJson({
      ok: true,
      code: "empty",
      valid: false,
      available: false,
      message: "Username is required.",
      ...(wantDebug ? { debug: { raw, normalized } } : {}),
    });
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return noStoreJson({
      ok: true,
      code: "invalid_format",
      valid: false,
      available: false,
      message: "Use 3–30 lowercase letters or numbers (a–z, 0–9).",
      ...(wantDebug ? { debug: { raw, normalized } } : {}),
    });
  }

  if (RESERVED.has(normalized)) {
    return noStoreJson({
      ok: true,
      code: "reserved",
      valid: false,
      available: false,
      message: "This username is reserved. Please choose another.",
      ...(wantDebug ? { debug: { raw, normalized } } : {}),
    });
  }

  // TEMP: hardcoded probe to separate UI vs API issues.
  // If the UI ever shows "taken" for this value, the issue is in the client mapping.
  if (normalized === "zzztestavailable123") {
    return noStoreJson({
      ok: true,
      code: "available",
      valid: true,
      available: true,
      message: "Available",
      ...(wantDebug
        ? { debug: { raw, normalized, exists: false, hit: null, probe: true } }
        : {}),
    });
  }

  try {
    await connectDB();

    // Exact case-insensitive match via collation
    let existing = null;
    try {
      existing = await User.findOne({ username: normalized })
        .collation({ locale: "en", strength: 2 })
        .select({ _id: 1, username: 1 })
        .lean();
    } catch {
      // Fallback: anchored case-insensitive regex
      existing = await User.findOne({
        username: { $regex: `^${normalized}$`, $options: "i" },
      })
        .select({ _id: 1, username: 1 })
        .lean();
    }

    const available = !existing;

    return noStoreJson({
      ok: true,
      code: available ? "available" : "taken",
      valid: true,
      available,
      message: available ? "Available" : "Username is already taken.",
      ...(wantDebug
        ? {
            debug: {
              raw,
              normalized,
              exists: !!existing,
              hit: existing?.username ?? null,
            },
          }
        : {}),
    });
  } catch (err) {
    console.error("Error checking username:", err);
    return noStoreJson(
      {
        ok: false,
        code: "server_error",
        valid: false,
        available: false,
        message: "Server error",
        ...(wantDebug
          ? { debug: { raw, normalized, error: String(err?.message || err) } }
          : {}),
      },
      500
    );
  }
}
