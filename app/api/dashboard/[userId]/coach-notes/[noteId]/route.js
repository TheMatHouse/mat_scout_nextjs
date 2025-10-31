// app/api/dashboard/[userId]/coach-notes/[noteId]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import CoachMatchNote from "@/models/coachMatchNoteModel";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import Team from "@/models/teamModel";
import User from "@/models/userModel";

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);
const oid = (id) => new Types.ObjectId(id);
const jserr = (status, message) =>
  NextResponse.json({ ok: false, message }, { status });

export async function GET(req, { params }) {
  await connectDB();

  const { userId, noteId } = await params;

  if (!isValidId(userId)) return jserr(400, "Invalid userId");
  if (!isValidId(noteId)) return jserr(400, "Invalid noteId");

  const me = await getCurrentUserFromCookies();
  if (!me) return jserr(401, "Not authenticated");
  if (String(me._id) !== String(userId)) return jserr(403, "Not authorized");

  // Build a small, robust aggregation that:
  // 1) Finds the note by _id
  // 2) Joins entry to figure out the athlete (across legacy shapes)
  // 3) Enforces visibility: createdBy == user OR athlete == user
  // 4) Joins event, team, coach for display fields
  const pipeline = [
    // Note by id, not soft-deleted (support both styles)
    {
      $match: {
        _id: oid(noteId),
        $or: [{ deletedAt: null }, { deleted: { $ne: true } }],
      },
    },

    // Join entry
    {
      $lookup: {
        from: "coachentries",
        localField: "entry",
        foreignField: "_id",
        as: "entry",
      },
    },
    { $unwind: { path: "$entry", preserveNullAndEmptyArrays: true } },

    // Normalize athlete user id across possible shapes
    {
      $addFields: {
        _athleteRaw: {
          $ifNull: [
            "$entry.athlete.user",
            { $ifNull: ["$entry.athlete.userId", "$entry.athleteId"] },
          ],
        },
      },
    },
    {
      $addFields: {
        athleteUserForMatch: {
          $cond: [
            { $eq: [{ $type: "$_athleteRaw" }, "string"] },
            { $toObjectId: "$_athleteRaw" },
            "$_athleteRaw",
          ],
        },
      },
    },

    // Visibility gate (same rule as the list endpoint)
    {
      $match: {
        $or: [{ createdBy: oid(userId) }, { athleteUserForMatch: oid(userId) }],
      },
    },

    // Join event (authoritative team)
    {
      $lookup: {
        from: "coachevents",
        localField: "event",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },

    // Coalesce team id: event.team → note.team → entry.team
    {
      $addFields: {
        _teamIdRaw: {
          $ifNull: ["$event.team", { $ifNull: ["$team", "$entry.team"] }],
        },
      },
    },
    {
      $addFields: {
        teamIdForLookup: {
          $cond: [
            { $eq: [{ $type: "$_teamIdRaw" }, "string"] },
            { $toObjectId: "$_teamIdRaw" },
            "$_teamIdRaw",
          ],
        },
      },
    },

    // Join team
    {
      $lookup: {
        from: "teams",
        localField: "teamIdForLookup",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    // Join coach user → display name
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "coach",
      },
    },
    { $unwind: { path: "$coach", preserveNullAndEmptyArrays: true } },

    // Compose coachName
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
        _id: { $toString: "$_id" },
        createdAt: 1,
        updatedAt: 1,

        // denormalized for preview
        team: {
          teamId: { $toString: "$team._id" },
          teamName: "$team.teamName",
          teamSlug: "$team.teamSlug",
        },
        event: {
          eventId: { $toString: "$event._id" },
          name: "$event.name",
          startDate: "$event.startDate",
        },

        athleteName: 1,
        opponent: 1,
        whatWentWell: 1,
        reinforce: 1,
        needsFix: 1,
        techniques: 1,
        result: 1,
        score: 1,
        notes: 1,

        // video is optional in schema
        video: 1,

        coachId: { $toString: "$createdBy" },
        coachName: 1,
      },
    },
  ];

  try {
    const rows = await CoachMatchNote.aggregate(pipeline);
    if (!rows || rows.length === 0) {
      // Either not found or not visible to this user
      return jserr(404, "Note not found");
    }

    const note = rows[0];

    // Convenience: compute a YouTube embed URL if applicable (for the preview)
    let video = note.video || null;
    if (video?.url) {
      const idMatch = String(video.url).match(
        /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i
      );
      if (idMatch) {
        const startMs = Math.max(0, Number(video.startMs || 0) || 0);
        const startSec = Math.floor(startMs / 1000);
        const base = `https://www.youtube-nocookie.com/embed/${idMatch[1]}`;
        video = {
          ...video,
          embedUrl: startSec > 0 ? `${base}?start=${startSec}` : base,
        };
      }
    }

    return NextResponse.json(
      { ok: true, note: { ...note, video } },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "GET /api/dashboard/[userId]/coach-notes/[noteId] error:",
      err
    );
    return jserr(500, "Failed to fetch note");
  }
}
