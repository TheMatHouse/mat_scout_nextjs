// app/api/teams/[slug]/coach-notes/entries/[entryId]/matches/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";

export async function GET(_, { params }) {
  await connectDB();
  const { slug, entryId } = await params;
  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const entry = await CoachEntry.findOne({
    _id: entryId,
    team: gate.teamId,
    deletedAt: null,
  }).lean();
  if (!entry)
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const notes = await CoachMatchNote.find({ entry: entry._id, deletedAt: null })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ notes });
}

export async function POST(request, { params }) {
  await connectDB();
  const { slug, entryId } = await params;
  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const entry = await CoachEntry.findOne({
    _id: entryId,
    team: gate.teamId,
    deletedAt: null,
  });
  if (!entry)
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const evt = await CoachEvent.findOne({
    _id: entry.event,
    team: gate.teamId,
    deletedAt: null,
  });
  if (!evt)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const payload = await request.json();
  const note = await CoachMatchNote.create({
    event: evt._id,
    entry: entry._id,
    team: gate.teamId,
    athleteName: entry.athlete.name,
    opponent: payload.opponent || {},
    whatWentWell: payload.whatWentWell || "",
    reinforce: payload.reinforce || "",
    needsFix: payload.needsFix || "",
    techniques: payload.techniques || { ours: [], theirs: [] },
    result: payload.result || "",
    score: payload.score || "",
    notes: payload.notes || "",
    createdBy: user._id,
  });

  return NextResponse.json({ note });
}

// Optional DELETE for a single match (manager or note owner)
export async function DELETE(request, { params }) {
  await connectDB();
  const { slug, entryId } = await params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const note = await CoachMatchNote.findOne({
    _id: id,
    entry: entryId,
    team: gate.teamId,
    deletedAt: null,
  });
  if (!note)
    return NextResponse.json({ error: "Note not found" }, { status: 404 });

  if (!canDelete(gate.role, note.createdBy, user._id, "match")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  note.deletedAt = new Date();
  await note.save();
  return NextResponse.json({ ok: true });
}
