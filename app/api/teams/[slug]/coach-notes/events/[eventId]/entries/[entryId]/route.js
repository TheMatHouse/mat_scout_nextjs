// app/api/teams/[slug]/coach-notes/entries/[entryId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";
import CoachEntry from "@/models/coachEntryModel";

export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const { slug, entryId } = await params;

    const user = await getCurrentUserFromCookies().catch(() => null);
    // Managers only (you can loosen to ["manager","coach"] if desired)
    const gate = await requireTeamRole(user?._id, slug, ["manager"]);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.reason }, { status: gate.status });
    }

    const entry = await CoachEntry.findOne({
      _id: entryId,
      team: gate.teamId,
      deletedAt: null,
    });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    entry.deletedAt = new Date();
    await entry.save();

    return NextResponse.json({
      ok: true,
      message: "Athlete removed (soft-deleted).",
    });
  } catch (err) {
    console.error("DELETE /entries/[entryId] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
