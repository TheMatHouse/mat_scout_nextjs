import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import { getCurrentUser } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

export async function GET(req, { params }) {
  await connectDB();

  const { memberId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ events: [] });
  }

  // verify parent owns this family member
  const fm = await FamilyMember.findOne({
    _id: memberId,
    userId: user._id,
  }).lean();

  if (!fm) {
    return NextResponse.json({ events: [] });
  }

  // fetch teams parent belongs to
  const links = await TeamMember.find({
    userId: user._id,
  })
    .select("teamId")
    .lean();

  const teamIds = links.map((l) => l.teamId);

  if (!teamIds.length) {
    return NextResponse.json({ events: [] });
  }

  // find entries where athlete.familyMember = memberId
  const entries = await CoachEntry.find({
    familyMember: memberId,
    deletedAt: null,
  })
    .select("event")
    .lean();

  const eventIds = [...new Set(entries.map((e) => String(e.event)))];

  if (!eventIds.length) {
    return NextResponse.json({ events: [] });
  }

  const events = await Promise.all(
    eventIds.map(async (eid) => {
      const evt = await CoachEvent.findById(eid).lean();
      if (!evt) return null;

      const notes = await CoachMatchNote.find({
        event: eid,
        deleted: { $ne: true },
      })
        .sort({ createdAt: 1 })
        .lean();

      return {
        _id: evt._id,
        name: evt.name,
        date: evt.startDate ? new Date(evt.startDate).toLocaleDateString() : "",
        matches: notes.map((n) => ({
          _id: n._id,
          opponent: n.opponent,
          result: n.result,
          score: n.score,
          notes: n.notes,
        })),
      };
    })
  );

  return NextResponse.json({
    events: events.filter(Boolean),
  });
}
