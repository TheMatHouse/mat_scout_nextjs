// app/api/teams/[slug]/password/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export async function PATCH(req, context) {
  try {
    await connectDB();

    const { params } = context;
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { message: "Missing team slug" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      saltB64,
      iterations,
      verifierB64,
      wrappedTeamKeyB64,
      teamKeyVersion,
    } = await req.json();

    if (!saltB64 || !verifierB64 || !wrappedTeamKeyB64) {
      return NextResponse.json(
        { message: "Missing required encryption parameters" },
        { status: 400 }
      );
    }

    // Handle slug normalization (_ vs -) the same way as other team routes
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // TODO (optional): restrict to team owner/manager
    if (!team.security) team.security = {};
    if (!team.security.kdf) team.security.kdf = {};
    if (!team.security.encryption) team.security.encryption = {};

    team.security.kdf.saltB64 = saltB64;
    team.security.kdf.iterations = iterations || 250000;
    team.security.verifierB64 = verifierB64;
    team.security.lockEnabled = true;

    team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;
    if (typeof teamKeyVersion === "number") {
      team.security.encryption.teamKeyVersion = teamKeyVersion;
    }

    await team.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PATCH /teams/[slug]/password error:", err);
    return NextResponse.json(
      { message: "Failed to update team password", error: err.message },
      { status: 500 }
    );
  }
}
