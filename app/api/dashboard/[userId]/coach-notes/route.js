// app/api/dashboard/[userId]/coach-notes/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import "@/models/coachEntryModel";
import "@/models/coachEventModel";
import "@/models/teamModel"; // ensure Team is registered so $lookup can hydrate correctly

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);
const oid = (id) => new Types.ObjectId(id);
const jserr = (status, message) =>
  NextResponse.json({ ok: false, message }, { status });

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}

/**
 * GET /api/dashboard/:userId/coach-notes?teamId=<id>&sort=recent|alpha
 * Returns teams grouped with events and notes for the signed-in athlete.
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
    { $match: { deletedAt: null } },

    // Join entry to verify athlete is this user; also provides entry.team fallback
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

    // Join event (authoritative source of team)
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
        teamIdForLookup: {
          $ifNull: ["$event.team", { $ifNull: ["$team", "$entry.team"] }],
        },
      },
    },

    // Force ObjectId type for lookups even if a string slipped in
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

    // Optional filter by team
    ...(teamId && isValidId(teamId)
      ? [{ $match: { teamIdForLookup: oid(teamId) } }]
      : []),

    // Lookup Team — NOTE: your fields are teamName / teamSlug
    {
      $lookup: {
        from: "teams",
        localField: "teamIdForLookup",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    // Lookup Coach user for display name
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "coach",
      },
    },
    { $unwind: { path: "$coach", preserveNullAndEmptyArrays: true } },

    // Compose coachName with fallbacks
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

    // GROUP: TEAM + EVENT (to produce events under each team)
    {
      $group: {
        _id: {
          teamId: "$team._id",
          teamName: "$team.teamName", // <-- correct field
          teamSlug: "$team.teamSlug", // <-- correct field
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

    // Sort notes inside event (newest first)
    {
      $addFields: {
        notes: { $sortArray: { input: "$notes", sortBy: { createdAt: -1 } } },
      },
    },

    // Sort events (newest event first, then name)
    { $sort: { "_id.eventStartDate": -1, "_id.eventName": 1 } },

    // REGROUP: by TEAM (collect events)
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

    // Sort teams: most recent first (or A–Z)
    ...(sortMode === "alpha"
      ? [{ $sort: { "_id.teamName": 1, latestDate: -1 } }]
      : [{ $sort: { latestDate: -1, "_id.teamName": 1 } }]),

    // Final projection (fall back to teamSlug only if teamName missing)
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
    console.error("GET /api/dashboard/[userId]/coach-notes error:", err);
    return jserr(500, "Failed to fetch coach notes");
  }
}
