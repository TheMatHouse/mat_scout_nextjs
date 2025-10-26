import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";
import User from "@/models/userModel";

export async function GET(_req, { params }) {
  await connectDB();
  const { slug, eventId } = await params;

  const user = await getCurrentUserFromCookies().catch(() => null);
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const entries = await CoachEntry.find({ event: eventId, deletedAt: null })
    .sort({ "athlete.name": 1 })
    .lean();

  return NextResponse.json({ entries });
}

export async function POST(req, { params }) {
  await connectDB();
  const { slug, eventId } = await params;

  const user = await getCurrentUserFromCookies().catch(() => null);
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const { athleteUserId, athlete } = body || {};

  const event = await CoachEvent.findById(eventId).lean();
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let payload;

  if (athleteUserId) {
    // MEMBER path (like Scouting): link to user + snapshot
    const u = await User.findById(athleteUserId).lean();
    if (!u)
      return NextResponse.json(
        { error: "Athlete user not found" },
        { status: 404 }
      );

    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      "Athlete";
    payload = {
      event: event._id,
      team: gate.teamId,
      athlete: {
        user: u._id,
        name: fullName,
        club: u.club || "",
        country: u.country || "",
      },
      createdBy: user._id,
    };
  } else if (athlete?.name) {
    // GUEST path (like Scouting’s external option)
    payload = {
      event: event._id,
      team: gate.teamId,
      athlete: {
        user: null,
        name: String(athlete.name).trim(),
        club: athlete.club || "",
        country: athlete.country || "",
      },
      createdBy: user._id,
    };
  } else {
    return NextResponse.json(
      { error: "Provide either athleteUserId or athlete { name }" },
      { status: 400 }
    );
  }

  const entry = await CoachEntry.create(payload);
  return NextResponse.json({ entry });
}
