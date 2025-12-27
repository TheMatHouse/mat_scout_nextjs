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
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const entries = await CoachEntry.find({
    event: eventId,
    deletedAt: null,
  })
    .sort({ "athlete.name": 1 })
    .lean();

  return NextResponse.json({ entries });
}

export async function POST(req, { params }) {
  await connectDB();
  const { slug, eventId } = await params;

  const user = await getCurrentUserFromCookies().catch(() => null);
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
  }

  const body = await req.json().catch(() => ({}));
  const { athleteUserId, athleteFamilyMemberId } = body || {};

  const event = await CoachEvent.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // -------------------------------------------------
  // 🚫 GUESTS ARE NO LONGER ALLOWED (HARD BLOCK)
  // -------------------------------------------------
  if (!athleteUserId && !athleteFamilyMemberId) {
    return NextResponse.json(
      {
        error:
          "Guests are not allowed. Athlete must be a team user or family member.",
      },
      { status: 400 }
    );
  }

  let payload;

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
  } else {
    // athleteFamilyMemberId is guaranteed here
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
  }

  const entry = await CoachEntry.create(payload);
  return NextResponse.json({ entry });
}
