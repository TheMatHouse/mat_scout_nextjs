// app/api/teams/[slug]/encryption/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";

// Utility: resolve team by slug variants
async function findTeamBySlug(rawSlug) {
  const slug = decodeURIComponent(String(rawSlug || "")).toLowerCase();

  return (
    (await Team.findOne({ teamSlug: slug })) ||
    (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
    (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }))
  );
}

// 🔹 GET: return encryption metadata (wrapped TBK) for the owner
export async function GET(_req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { params } = context;
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    const team = await findTeamBySlug(slug);
    if (!team) {
      return NextResponse.json(
        { ok: false, message: "Team not found" },
        { status: 404 }
      );
    }

    // Only the owner should see encryption metadata
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const enc = team.security?.encryption || {};
    return NextResponse.json(
      {
        ok: true,
        wrappedTeamKeyB64: enc.wrappedTeamKeyB64 || "",
        teamKeyVersion: enc.teamKeyVersion != null ? enc.teamKeyVersion : 1,
        encryption: {
          ...enc,
          algorithm: enc.algorithm || "TBK-AES-GCM-256",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("/encryption GET error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to load encryption metadata" },
      { status: 500 }
    );
  }
}

// 🔹 PATCH: update encryption metadata (this is what persistWrappedTeamKey uses)
export async function PATCH(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { params } = context;
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    const team = await findTeamBySlug(slug);
    if (!team) {
      return NextResponse.json(
        { ok: false, message: "Team not found" },
        { status: 404 }
      );
    }

    // Owner-only
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const wrappedTeamKeyB64 = body?.wrappedTeamKeyB64 || "";
    const teamKeyVersion =
      body?.teamKeyVersion != null ? body.teamKeyVersion : 1;

    if (!wrappedTeamKeyB64) {
      return NextResponse.json(
        { ok: false, message: "wrappedTeamKeyB64 is required" },
        { status: 400 }
      );
    }

    if (!team.security) team.security = {};
    if (!team.security.encryption) team.security.encryption = {};

    team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;
    team.security.encryption.teamKeyVersion = teamKeyVersion;

    // Keep algorithm field in sync with the TBK-based scheme
    team.security.encryption.algorithm = "TBK-AES-GCM-256";

    await team.save();

    return NextResponse.json(
      {
        ok: true,
        encryption: team.security.encryption,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("/encryption PATCH error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to update encryption metadata" },
      { status: 500 }
    );
  }
}
