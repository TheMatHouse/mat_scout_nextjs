// app/api/teams/[slug]/security/verify/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const slug = decodeURIComponent(String((await params).slug || ""));
    const team = await Team.findOne({ teamSlug: slug })
      .select("security _id")
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const clientVerifier = String(body?.verifierB64 || "");
    const serverVerifier = String(team.security?.verifierB64 || "");

    if (!team.security?.lockEnabled || !serverVerifier) {
      // If lock isn't enabled, treat as unlocked.
      return NextResponse.json({ ok: true, unlocked: true });
    }

    if (!clientVerifier) {
      return NextResponse.json(
        { message: "Missing verifier" },
        { status: 400 }
      );
    }

    // Constant-time compare
    const a = Uint8Array.from(atob(clientVerifier), (c) => c.charCodeAt(0));
    const b = Uint8Array.from(atob(serverVerifier), (c) => c.charCodeAt(0));
    if (a.length !== b.length) {
      return NextResponse.json({ ok: false, unlocked: false }, { status: 401 });
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];

    if (diff === 0) {
      return NextResponse.json({ ok: true, unlocked: true });
    }
    return NextResponse.json({ ok: false, unlocked: false }, { status: 401 });
  } catch (err) {
    console.error("Team security VERIFY error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
