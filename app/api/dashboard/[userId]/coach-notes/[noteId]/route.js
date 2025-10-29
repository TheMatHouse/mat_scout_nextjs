// app/api/dashboard/[userId]/coach-notes/[noteId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import "@/models/coachEntryModel";
import "@/models/coachEventModel";
import "@/models/teamModel"; // ensure Team is registered

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);
const oid = (id) => new Types.ObjectId(id);
const jserr = (status, message) =>
  NextResponse.json({ ok: false, message }, { status });

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

// GET /api/dashboard/:userId/coach-notes/:noteId
export async function GET(_req, { params }) {
  await connectDB();

  const { userId, noteId } = await params;
  if (!isValidId(userId)) return jserr(400, "Invalid userId");
  if (!isValidId(noteId)) return jserr(400, "Invalid noteId");

  const me = await getCurrentUserFromCookies();
  if (!me) return jserr(401, "Not authenticated");
  if (String(me._id) !== String(userId)) return jserr(403, "Not authorized");

  // Aggregate to (1) enforce athlete ownership, (2) enrich event/team/coach, (3) project clean fields
  const pipeline = [
    { $match: { _id: oid(noteId), deletedAt: null } },

    // Verify the note is for this athlete via CoachEntry
    {
      $lookup: {
        from: "coachentries",
        localField: "entry",
        foreignField: "_id",
        as: "entry",
      },
    },
    { $unwind: "$entry" },
    { $match: { "entry.athlete.user": oid(userId) } },

    // Event (authoritative source for team)
    {
      $lookup: {
        from: "coachevents",
        localField: "event",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },

    // Resolve team id: event.team → note.team → entry.team
    {
      $addFields: {
        teamIdForLookup: {
          $ifNull: ["$event.team", { $ifNull: ["$team", "$entry.team"] }],
        },
      },
    },
    {
      $addFields: {
        teamIdForLookup: {
          $cond: [
            { $eq: [{ $type: "$teamIdForLookup" }, "string"] },
            { $toObjectId: "$teamIdForLookup" },
            "$teamIdForLookup",
          ],
        },
      },
    },

    // Team
    {
      $lookup: {
        from: "teams",
        localField: "teamIdForLookup",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    // Coach display
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "coach",
      },
    },
    { $unwind: { path: "$coach", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        coachName: {
          $ifNull: [
            "$coach.displayName",
            {
              $ifNull: [
                "$coach.name",
                {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$coach.firstName", ""] },
                        " ",
                        { $ifNull: ["$coach.lastName", ""] },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },

    // Final projection
    {
      $project: {
        _id: 1,
        createdAt: 1,
        updatedAt: 1,
        athleteName: 1,
        opponent: 1,
        whatWentWell: 1,
        reinforce: 1,
        needsFix: 1,
        techniques: 1,
        result: 1,
        score: 1,
        notes: 1,
        coachName: 1,
        event: {
          _id: "$event._id",
          name: "$event.name",
          startDate: "$event.startDate",
        },
        team: {
          _id: "$team._id",
          teamName: "$team.teamName", // your schema
          teamSlug: "$team.teamSlug", // your schema
        },
      },
    },
  ];

  try {
    const rows = await CoachMatchNote.aggregate(pipeline).limit(1);
    if (!rows.length) return jserr(404, "Note not found");

    const n = rows[0];
    const note = {
      _id: String(n._id),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      athleteName: n.athleteName || "",
      opponent: n.opponent || {},
      whatWentWell: n.whatWentWell || "",
      reinforce: n.reinforce || "",
      needsFix: n.needsFix || "",
      techniques: n.techniques || { ours: [], theirs: [] },
      result: n.result || "",
      score: n.score || "",
      notes: n.notes || "",
      coachName: n.coachName || "Coach",
      event: n.event
        ? {
            _id: n.event._id ? String(n.event._id) : null,
            name: n.event.name || "Event",
            startDate: n.event.startDate || null,
          }
        : null,
      team: n.team
        ? {
            _id: n.team._id ? String(n.team._id) : null,
            teamName: n.team.teamName || n.team.teamSlug || "Team",
            teamSlug: n.team.teamSlug || null,
          }
        : null,
    };

    return NextResponse.json({ ok: true, note }, { status: 200 });
  } catch (err) {
    console.error(
      "GET /api/dashboard/[userId]/coach-notes/[noteId] error:",
      err
    );
    return jserr(500, "Failed to fetch note");
  }
}
