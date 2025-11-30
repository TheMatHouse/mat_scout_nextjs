// app/api/teams/[slug]/coach-notes/events/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";
import FamilyMember from "@/models/familyMemberModel";

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const { slug } = await params;

    const user = await getCurrentUserFromCookies().catch(() => null);

    // -----------------------------
    // Determine role (owner → manager)
    // -----------------------------
    const gate = await requireTeamRole(user?._id, slug, [
      "manager",
      "coach",
      "member",
    ]);

    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const isManagerOrCoach = gate.role === "manager" || gate.role === "coach";
    const teamId = gate.teamId;

    // ============================
    // A) MANagers/COACHES/OWNERS
    // ============================
    if (isManagerOrCoach) {
      const events = await CoachEvent.find({
        team: teamId,
        deletedAt: null,
      })
        .sort({ startDate: -1 })
        .lean();

      return NextResponse.json({ events });
    }

    // ============================
    // B) MEMBERS — RESTRICTED VIEW
    // ============================

    // 1) Get family members (children)
    const kids = await FamilyMember.find({ userId: user._id })
      .select("_id")
      .lean();
    const kidIds = kids.map((k) => k._id.toString());

    // 2) Find entries belonging to user or their kids
    const entries = await CoachEntry.find({
      team: teamId,
      deletedAt: null,
      $or: [
        { "athlete.user": user._id },
        { "athlete.familyMember": { $in: kidIds } },
      ],
    })
      .select("event")
      .lean();

    const eventIds = [...new Set(entries.map((e) => e.event.toString()))];

    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // 3) Load only the events they are tied to
    const events = await CoachEvent.find({
      _id: { $in: eventIds },
      deletedAt: null,
    })
      .sort({ startDate: -1 })
      .lean();

    return NextResponse.json({ events });
  } catch (err) {
    console.error("GET coach-notes/events failed:", err);
    return NextResponse.json(
      { error: "Server error loading events" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { slug } = await params;

    const user = await getCurrentUserFromCookies().catch(() => null);
    const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const body = await request.json().catch(() => ({}));
    const { name, startDate, endDate, location } = body || {};

    if (!name || !startDate) {
      return NextResponse.json(
        { error: "name and startDate are required" },
        { status: 400 }
      );
    }

    const dStart = new Date(startDate);
    if (Number.isNaN(dStart.getTime())) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    const dEnd = endDate ? new Date(endDate) : undefined;
    if (dEnd && Number.isNaN(dEnd.getTime())) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    }

    const evt = await CoachEvent.create({
      team: gate.teamId,
      name: String(name).trim(),
      startDate: dStart,
      endDate: dEnd,
      location: location ? String(location).trim() : undefined,
      createdBy: user._id,
    });

    return NextResponse.json({ event: evt });
  } catch (err) {
    console.error("POST coach-notes/events failed:", err);
    const msg =
      err?.code === 11000
        ? "An event with this name and date already exists for this team."
        : err?.message || "Server error creating event";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
