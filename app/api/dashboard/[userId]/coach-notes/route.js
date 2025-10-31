// app/api/dashboard/[userId]/coach-notes/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import CoachMatchNote from "@/models/coachMatchNoteModel";

// Ensure these models are registered for $lookup stages
import "@/models/coachEntryModel";
import "@/models/coachEventModel";
import "@/models/teamModel";

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);
const oid = (id) => new Types.ObjectId(id);
const jserr = (status, message) =>
  NextResponse.json({ ok: false, message }, { status });

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

/**
 * GET /api/dashboard/:userId/coach-notes?teamId=<id>&sort=recent|alpha
 * Shows coach notes visible to the signed-in user:
 *  - Notes AUTHORED by this user (createdBy == userId), OR
 *  - Notes where the entry’s athlete IS this user.
 */
export async function GET(req, { params }) {
  await connectDB();

  const { userId } = await params;
  if (!isValidId(userId)) return jserr(400, "Invalid userId");

  const me = await getCurrentUserFromCookies();
  if (!me) return jserr(401, "Not authenticated");
  if (String(me._id) !== String(userId)) return jserr(403, "Not authorized");

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const sortMode = (searchParams.get("sort") || "recent").toLowerCase();

  const pipeline = [
    // accept both soft-delete styles
    { $match: { $or: [{ deletedAt: null }, { deleted: { $ne: true } }] } },

    // join entry (source of athlete mapping and team fallback)
    {
      $lookup: {
        from: "coachentries",
        localField: "entry",
        foreignField: "_id",
        as: "entry",
      },
    },
    { $unwind: "$entry" },

    // normalize athlete id across legacy/new shapes
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

    // visibility: authored by user OR athlete is user
    {
      $match: {
        $or: [{ createdBy: oid(userId) }, { athleteUserForMatch: oid(userId) }],
      },
    },

    // join event (authoritative team)
    {
      $lookup: {
        from: "coachevents",
        localField: "event",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },

    // coalesce team id from event → note.team → entry.team
    {
      $addFields: {
        teamIdForLookup: {
          $ifNull: ["$event.team", { $ifNull: ["$team", "$entry.team"] }],
        },
      },
    },
    // ensure ObjectId type for lookups (string → ObjectId)
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

    ...(teamId && isValidId(teamId)
      ? [{ $match: { teamIdForLookup: oid(teamId) } }]
      : []),

    // team lookup
    {
      $lookup: {
        from: "teams",
        localField: "teamIdForLookup",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    // coach user lookup → display name
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

    // group by TEAM+EVENT
    {
      $group: {
        _id: {
          teamId: "$team._id",
          teamName: "$team.teamName",
          teamSlug: "$team.teamSlug",
          eventId: "$event._id",
          eventName: "$event.name",
          eventStartDate: "$event.startDate",
        },
        lookupTeamIdRaw: { $first: "$teamIdForLookup" },
        latestDate: { $max: "$createdAt" },
        count: { $sum: 1 },
        notes: {
          $push: {
            _id: "$_id",
            createdAt: "$createdAt",
            coachId: "$createdBy",
            coachName: "$coachName",
            opponentName: "$opponent.name",
            result: "$result",
            score: "$score",
            notes: "$notes",
          },
        },
      },
    },

    // sort notes within each event (newest first)
    {
      $addFields: {
        notes: { $sortArray: { input: "$notes", sortBy: { createdAt: -1 } } },
      },
    },

    // sort events
    { $sort: { "_id.eventStartDate": -1, "_id.eventName": 1 } },

    // regroup by TEAM
    {
      $group: {
        _id: {
          teamId: "$_id.teamId",
          teamName: "$_id.teamName",
          teamSlug: "$_id.teamSlug",
        },
        latestDate: { $max: "$latestDate" },
        totalCount: { $sum: "$count" },
        teamIdRaw: { $first: "$lookupTeamIdRaw" },
        events: {
          $push: {
            eventId: "$_id.eventId",
            eventName: "$_id.eventName",
            eventStartDate: "$_id.eventStartDate",
            count: "$count",
            notes: "$notes",
          },
        },
      },
    },

    // sort teams recent-first (or A–Z)
    ...(sortMode === "alpha"
      ? [{ $sort: { "_id.teamName": 1, latestDate: -1 } }]
      : [{ $sort: { latestDate: -1, "_id.teamName": 1 } }]),

    // final projection
    {
      $project: {
        _id: 0,
        teamId: "$_id.teamId",
        teamName: {
          $cond: [
            { $ne: ["$_id.teamName", null] },
            "$_id.teamName",
            "$_id.teamSlug",
          ],
        },
        teamSlug: "$_id.teamSlug",
        latestDate: 1,
        count: "$totalCount",
        events: 1,
        teamIdRaw: {
          $cond: [
            { $eq: ["$_id.teamId", null] },
            { $toString: "$teamIdRaw" },
            null,
          ],
        },
      },
    },
  ];

  try {
    const grouped = await CoachMatchNote.aggregate(pipeline);

    const teams = (grouped || []).map((t) => ({
      ...t,
      teamId: t.teamId ? String(t.teamId) : null,
      teamIdRaw: t.teamIdRaw || null,
      events: (t.events || []).map((e) => ({
        ...e,
        eventId: e.eventId ? String(e.eventId) : null,
        notes: (e.notes || []).map((n) => ({
          ...n,
          _id: String(n._id),
          coachId: n.coachId ? String(n.coachId) : null,
        })),
      })),
    }));

    return NextResponse.json({ ok: true, teams }, { status: 200 });
  } catch (err) {
    // Log the real reason to server console
    console.error(
      "GET /api/dashboard/[userId]/coach-notes aggregation error:",
      err
    );
    return jserr(500, "Failed to fetch coach notes");
  }
}
