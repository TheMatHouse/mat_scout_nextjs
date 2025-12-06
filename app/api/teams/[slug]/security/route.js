// app/api/teams/[slug]/security/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent((await params).slug);

    // Owner receives security block EXCEPT wrappedTBK
    const isOwnerQuery = req.nextUrl.searchParams.get("fullSecurity") === "1";

    const projection = isOwnerQuery
      ? {
          teamSlug: 1,
          security: 1,
        }
      : {
          teamSlug: 1,
          "security.lockEnabled": 1,
        };

    const team = await Team.findOne({ teamSlug: slug })
      .select(projection)
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // If owner requests fullSecurity, remove wrappedTBK
    if (isOwnerQuery && team.security?.wrappedTBK) {
      team.security = {
        ...team.security,
        wrappedTBK: undefined, // NEVER send wrappedTBK except via verify route
      };
    }

    return NextResponse.json({ team });
  } catch (err) {
    console.error("SECURITY GET ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent((await params).slug);
    const body = await req.json().catch(() => ({}));

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    if (String(team.user) !== String(user._id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const lockEnabled = !!body.lockEnabled;

    const db = mongoose.connection.db;
    const col = db.collection("teams");

    await col.updateOne(
      { _id: team._id },
      {
        $set: {
          "security.lockEnabled": lockEnabled,
        },
      }
    );

    return NextResponse.json({
      ok: true,
      lockEnabled,
      message: lockEnabled ? "Team lock enabled." : "Team lock disabled.",
    });
  } catch (err) {
    console.error("SECURITY PATCH ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
