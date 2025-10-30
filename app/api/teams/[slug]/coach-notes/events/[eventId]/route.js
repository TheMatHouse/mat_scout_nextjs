export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug, eventId } = await params;

    // optional diag
    console.log("[DELETE coach-event] hit", {
      slug,
      eventId,
      db: mongoose.connection?.name,
    });

    const user = await getCurrentUserFromCookies().catch(() => null);
    // Restrict to managers/coaches; add "owner" if needed in your role model
    const gate = await requireTeamRole(user?._id, slug, [
      "manager",
      "coach",
      "owner",
    ]);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const { searchParams } = new URL(req.url);
    const cascade = (searchParams.get("cascade") || "none").toLowerCase(); // "none" | "entries" | "notes"

    // 1) Load event
    const found = await CoachEvent.findById(eventId).lean();
    if (!found) {
      return NextResponse.json(
        { error: "Event not found for this id." },
        { status: 404 }
      );
    }

    // 2) Ensure event belongs to this team
    if (String(found.team) !== String(gate.teamId)) {
      return NextResponse.json(
        {
          error: "Event belongs to a different team.",
          debug: {
            eventTeamId: String(found.team),
            slugTeamId: String(gate.teamId),
          },
        },
        { status: 403 }
      );
    }

    // 3) Idempotent: already removed?
    if (found.deletedAt) {
      return NextResponse.json({
        ok: true,
        alreadyRemoved: true,
        message: "Event was already removed.",
      });
    }

    // 4) Soft-delete the event
    await CoachEvent.updateOne(
      { _id: eventId },
      { $set: { deletedAt: new Date() } }
    );

    // 5) Optional cascade:
    //   - "entries": soft-delete all entries for this event
    //   - "notes":   soft-delete entries AND their notes
    let cascadedEntries = false;
    let cascadedNotes = false;

    if (cascade === "entries" || cascade === "notes") {
      const now = new Date();
      await CoachEntry.updateMany(
        { event: eventId, deletedAt: null },
        { $set: { deletedAt: now } }
      );
      cascadedEntries = true;

      if (cascade === "notes") {
        await CoachMatchNotes.updateMany(
          { event: eventId, deletedAt: null },
          { $set: { deletedAt: now } }
        );
        cascadedNotes = true;
      }
    }

    return NextResponse.json({
      ok: true,
      cascade: {
        entries: cascadedEntries,
        notes: cascadedNotes,
      },
      message:
        cascade === "notes"
          ? "Event, athletes, and notes removed."
          : cascade === "entries"
          ? "Event and athletes removed."
          : "Event removed.",
    });
  } catch (err) {
    console.error(
      "DELETE /teams/[slug]/coach-notes/events/[eventId] failed:",
      err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
