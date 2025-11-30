import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";

export async function GET(_req, { params }) {
  await connectDB();
  const { slug, eventId } = await params;

  const user = await getCurrentUserFromCookies().catch(() => null);

  // Allow manager, coach, member
  const gate = await requireTeamRole(user?._id, slug, [
    "manager",
    "coach",
    "member",
  ]);

  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const isManagerOrCoach = gate.role === "manager" || gate.role === "coach";

  /* ============================================================
     A) MANAGER / COACH — unrestricted
     ============================================================ */
  if (isManagerOrCoach) {
    const entries = await CoachEntry.find({
      event: eventId,
      deletedAt: null,
    })
      .sort({ "athlete.name": 1 })
      .lean();

    return NextResponse.json({ entries });
  }

  /* ============================================================
     B) MEMBER — restricted to:
        - entries where athlete.user == user._id
        - OR entries where athlete.familyMember is one of their kids
     ============================================================ */

  // Get children of this member
  const kids = await FamilyMember.find({ userId: user._id })
    .select("_id")
    .lean();

  const kidIds = kids.map((k) => k._id.toString());

  const entries = await CoachEntry.find({
    event: eventId,
    deletedAt: null,
    $or: [
      { "athlete.user": user._id },
      { "athlete.familyMember": { $in: kidIds } },
    ],
  })
    .sort({ "athlete.name": 1 })
    .lean();

  return NextResponse.json({ entries });
}

export async function POST(req, { params }) {
  await connectDB();
  const { slug, eventId } = await params;

  const user = await getCurrentUserFromCookies().catch(() => null);

  // POST allowed only for manager/coach
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);

  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const { athleteUserId, athleteFamilyMemberId, athlete } = body || {};

  const event = await CoachEvent.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let payload;

  /* ------------------------------------------------------------
     USER athlete
     ------------------------------------------------------------ */
  if (athleteUserId) {
    const u = await User.findById(athleteUserId).lean();
    if (!u) {
      return NextResponse.json(
        { error: "Athlete user not found" },
        { status: 404 }
      );
    }

    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      "Athlete";

    payload = {
      event: event._id,
      team: gate.teamId,
      athlete: {
        user: u._id,
        familyMember: null,
        name: fullName,
        club: u.club || "",
        country: u.country || "",
      },
      createdBy: user._id,
    };
  } else if (athleteFamilyMemberId) {

  /* ------------------------------------------------------------
     FAMILY MEMBER athlete
     ------------------------------------------------------------ */
    const fm = await FamilyMember.findById(athleteFamilyMemberId).lean();
    if (!fm) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    const fullName =
      [fm.firstName, fm.lastName].filter(Boolean).join(" ") ||
      fm.username ||
      "Athlete";

    payload = {
      event: event._id,
      team: gate.teamId,
      athlete: {
        user: null,
        familyMember: fm._id,
        name: fullName,
        club: fm.club || "",
        country: fm.country || "",
      },
      createdBy: user._id,
    };
  } else if (athlete?.name) {

  /* ------------------------------------------------------------
     GUEST athlete
     ------------------------------------------------------------ */
    payload = {
      event: event._id,
      team: gate.teamId,
      athlete: {
        user: null,
        familyMember: null,
        name: String(athlete.name).trim(),
        club: athlete.club || "",
        country: athlete.country || "",
      },
      createdBy: user._id,
    };
  } else {

  /* ------------------------------------------------------------
     Missing athlete data
     ------------------------------------------------------------ */
    return NextResponse.json(
      {
        error:
          "Provide athleteUserId OR athleteFamilyMemberId OR athlete { name }",
      },
      { status: 400 }
    );
  }

  const entry = await CoachEntry.create(payload);
  return NextResponse.json({ entry });
}
