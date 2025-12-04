export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";

import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

import CoachEntry from "@/models/coachEntryModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

/**
 * DELETE — Remove a Coach Entry (athlete) from an event
 * Optional: ?cascade=notes → also soft-delete all match notes for this athlete.
 */
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug, eventId, entryId } = await params;

    const user = await getCurrentUserFromCookies().catch(() => null);

    const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    // Confirm entry exists
    const entry = await CoachEntry.findById(entryId).lean();
    if (!entry) {
      return NextResponse.json(
        {
          error: "Entry not found.",
          debug: { entryId, db: mongoose.connection?.name },
        },
        { status: 404 }
      );
    }

    // Ensure entry belongs to this team
    if (String(entry.team) !== String(gate.teamId)) {
      return NextResponse.json(
        {
          error: "Entry belongs to a different team.",
          debug: {
            entryTeamId: String(entry.team),
            slugTeamId: String(gate.teamId),
          },
        },
        { status: 403 }
      );
    }

    // Already deleted?
    if (entry.deletedAt) {
      return NextResponse.json({
        ok: true,
        alreadyRemoved: true,
        message: "Athlete already removed.",
      });
    }

    // Soft delete entry
    await CoachEntry.updateOne(
      { _id: entryId },
      { $set: { deletedAt: new Date() } }
    );

    // Cascade delete notes?
    const cascade = (
      new URL(req.url).searchParams.get("cascade") || "none"
    ).toLowerCase();

    if (cascade === "notes") {
      await CoachMatchNote.updateMany(
        { entry: entryId, team: gate.teamId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
    }

    return NextResponse.json({
      ok: true,
      cascade: cascade === "notes",
      message:
        cascade === "notes"
          ? "Athlete and all notes removed."
          : "Athlete removed.",
    });
  } catch (err) {
    console.error(
      "DELETE /coach-notes/events/[eventId]/entries/[entryId] failed:",
      err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
