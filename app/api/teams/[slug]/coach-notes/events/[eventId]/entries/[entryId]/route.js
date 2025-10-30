export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import CoachEntry from "@/models/coachEntryModel";

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { slug, entryId } = await params;

    // helpful log (remove after you confirm)
    console.log(
      "[DELETE coach-entry]",
      JSON.stringify({
        slug,
        entryId,
        db: mongoose.connection?.name,
        uriHost: mongoose.connection?.host,
      })
    );

    const user = await getCurrentUserFromCookies().catch(() => null);
    const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const url = new URL(req.url);
    const cascade = (url.searchParams.get("cascade") || "none").toLowerCase(); // "none" | "notes"

    // 1) Fetch by id so we can return precise errors
    const found = await CoachEntry.findById(entryId).lean();

    if (!found) {
      return NextResponse.json(
        {
          error: "Entry not found for this id.",
          hint: "Likely DB mismatch. Verify you're connected to the DB that contains this _id.",
          debug: {
            entryId,
            db: mongoose.connection?.name,
            slug,
          },
        },
        { status: 404 }
      );
    }

    // 2) Ensure the entry is for this team (derived from slug)
    if (String(found.team) !== String(gate.teamId)) {
      return NextResponse.json(
        {
          error: "Entry belongs to a different team.",
          debug: {
            entryTeamId: String(found.team),
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
        message: "Athlete was already removed.",
      });
    }

    // 4) Soft-delete entry
    await CoachEntry.updateOne(
      { _id: entryId },
      { $set: { deletedAt: new Date() } }
    );

    // 5) Optional cascade to notes
    if (cascade === "notes") {
      await CoachMatch.updateMany(
        { entry: entryId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
    }

    return NextResponse.json({
      ok: true,
      cascade: cascade === "notes",
      message:
        cascade === "notes" ? "Athlete and notes removed." : "Athlete removed.",
    });
  } catch (err) {
    console.error(
      "DELETE /teams/[slug]/coach-notes/entries/[entryId] failed:",
      err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
