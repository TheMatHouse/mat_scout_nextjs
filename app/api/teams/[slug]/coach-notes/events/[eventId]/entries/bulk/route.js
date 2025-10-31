// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/bulk/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";

/**
 * Body:
 * {
 *   items: Array<{ userId?: string, familyMemberId?: string }>
 * }
 */
export async function POST(req, { params }) {
  await connectDB();

  const { slug, eventId } = await params;
  const user = await getCurrentUserFromCookies().catch(() => null);

  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const { items } = body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const event = await CoachEvent.findById(eventId).lean();
  if (!event)
    return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const created = [];
  const skipped = [];

  for (const it of items) {
    try {
      if (it?.userId) {
        const u = await User.findById(it.userId).lean();
        if (!u) {
          skipped.push({ ...it, reason: "User not found" });
          continue;
        }

        const exists = await CoachEntry.findOne({
          event: event._id,
          "athlete.user": u._id,
          deletedAt: null,
        }).lean();
        if (exists) {
          skipped.push({ ...it, reason: "Already added" });
          continue;
        }

        const fullName =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          u.username ||
          "Athlete";

        const entry = await CoachEntry.create({
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
        });
        created.push(entry._id);
      } else if (it?.familyMemberId) {
        const fm = await FamilyMember.findById(it.familyMemberId).lean();
        if (!fm) {
          skipped.push({ ...it, reason: "Family member not found" });
          continue;
        }

        const exists = await CoachEntry.findOne({
          event: event._id,
          "athlete.familyMember": fm._id,
          deletedAt: null,
        }).lean();
        if (exists) {
          skipped.push({ ...it, reason: "Already added" });
          continue;
        }

        const fullName =
          [fm.firstName, fm.lastName].filter(Boolean).join(" ") ||
          fm.username ||
          "Athlete";

        const entry = await CoachEntry.create({
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
        });
        created.push(entry._id);
      } else {
        skipped.push({ ...it, reason: "Neither userId nor familyMemberId" });
      }
    } catch (err) {
      skipped.push({ ...it, reason: err.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    success: true,
    createdCount: created.length,
    skippedCount: skipped.length,
    createdIds: created,
    skipped,
  });
}
