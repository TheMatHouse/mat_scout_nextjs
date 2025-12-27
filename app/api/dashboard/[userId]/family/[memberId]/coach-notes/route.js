export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import CoachEvent from "@/models/coachEventModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

export async function GET(_req, { params }) {
  await connectDB();

  const { memberId } = await params;
  if (!memberId) {
    return NextResponse.json(
      { error: "Missing family member id" },
      { status: 400 }
    );
  }

  // --------------------------------------------------
  // Load all coach notes for this family member
  // --------------------------------------------------
  const notes = await CoachMatchNote.find({
    athleteType: "family",
    athleteId: memberId,
    deletedAt: null,
  })
    .lean()
    .sort({ createdAt: -1 });

  if (!notes.length) {
    return NextResponse.json({ teams: [] });
  }

  // --------------------------------------------------
  // Preload teams & events for grouping
  // --------------------------------------------------
  const teamIds = [...new Set(notes.map((n) => String(n.team)))];
  const eventIds = [...new Set(notes.map((n) => String(n.event)))];

  const teams = await Team.find(
    { _id: { $in: teamIds } },
    { teamName: 1, teamSlug: 1 }
  ).lean();

  const events = await CoachEvent.find(
    { _id: { $in: eventIds } },
    { eventName: 1 }
  ).lean();

  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const eventMap = Object.fromEntries(events.map((e) => [String(e._id), e]));

  // --------------------------------------------------
  // Group: Team → Event → Notes
  // --------------------------------------------------
  const grouped = {};

  for (const n of notes) {
    const teamId = String(n.team);
    const eventId = String(n.event);

    if (!grouped[teamId]) {
      grouped[teamId] = {
        teamId,
        teamName: teamMap[teamId]?.teamName || "Team",
        teamSlug: teamMap[teamId]?.teamSlug,
        events: {},
      };
    }

    if (!grouped[teamId].events[eventId]) {
      grouped[teamId].events[eventId] = {
        eventId,
        eventName: eventMap[eventId]?.eventName || "Event",
        notes: [],
      };
    }

    grouped[teamId].events[eventId].notes.push({
      _id: n._id,
      opponent: n.opponent,
      createdAt: n.createdAt,
      coachName: n.createdByName || "Coach",
    });
  }

  // --------------------------------------------------
  // Convert maps → arrays
  // --------------------------------------------------
  const result = Object.values(grouped).map((team) => ({
    ...team,
    events: Object.values(team.events),
  }));

  return NextResponse.json({ teams: result });
}
