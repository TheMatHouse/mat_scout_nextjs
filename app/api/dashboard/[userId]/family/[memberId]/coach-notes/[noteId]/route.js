// app/api/dashboard/family/[memberId]/coach-notes/[noteId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import CoachMatchNote from "@/models/coachMatchNoteModel";
import TeamMember from "@/models/teamMemberModel";

export async function GET(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { params } = context;
    const { memberId, noteId } = await params;

    // 🔒 Verify this family member belongs to the user
    const membership = await TeamMember.findOne({
      familyMemberId: memberId,
      userId: user._id,
      deletedAt: null,
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🔎 Load note
    const note = await CoachMatchNote.findOne({
      _id: noteId,
      deletedAt: null,
      "athletes.athleteId": memberId,
      "athletes.athleteType": "family",
    })
      .populate("team", "teamName teamSlug")
      .populate("coach", "firstName lastName");

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (err) {
    console.error("Family coach note load failed:", err);
    return NextResponse.json(
      { error: "Failed to load coach note" },
      { status: 500 }
    );
  }
}
