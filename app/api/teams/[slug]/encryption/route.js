// app/api/teams/[slug]/encryption/route.js
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

    const { wrappedTeamKeyB64, teamKeyVersion } = await req.json();

    if (!wrappedTeamKeyB64) {
      return NextResponse.json(
        { message: "Missing wrappedTeamKeyB64" },
        { status: 400 }
      );
    }

    // Handle slug normalization (_ vs -) the same way as your scouting reports route
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // OPTIONAL: tighten this later to owner/manager, etc.
    // For now, any authenticated user who knows the password (client side)
    // can cause the TBK to be stored. This route never sees the raw TBK or password.
    if (!team.security) team.security = {};
    if (!team.security.encryption) team.security.encryption = {};

    team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;
    if (typeof teamKeyVersion === "number") {
      team.security.encryption.teamKeyVersion = teamKeyVersion;
    }

    await team.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PATCH /teams/[slug]/encryption error:", err);
    return NextResponse.json(
      { message: "Failed to update team encryption", error: err.message },
      { status: 500 }
    );
  }
}
