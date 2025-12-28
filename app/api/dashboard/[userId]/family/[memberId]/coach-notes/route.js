export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";

import CoachMatchNote from "@/models/coachMatchNoteModel";

// required for lookups
import "@/models/coachEntryModel";
import "@/models/coachEventModel";
import "@/models/teamModel";

const oid = (id) => new Types.ObjectId(id);
const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

export async function GET(req, { params }) {
  await connectDB();

  const { userId, memberId } = await params;

  if (!isValidId(userId) || !isValidId(memberId)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const pipeline = [
    // --------------------------------------------------
    // base match: FAMILY athlete notes
    // --------------------------------------------------
    {
      $match: {
        athleteType: "family",
        athleteId: oid(memberId),
        $or: [{ deletedAt: null }, { deleted: { $ne: true } }],
      },
    },

    // --------------------------------------------------
    // entry (team fallback)
    // --------------------------------------------------
    {
      $lookup: {
        from: "coachentries",
        localField: "entry",
        foreignField: "_id",
        as: "entry",
      },
    },
    { $unwind: { path: "$entry", preserveNullAndEmptyArrays: true } },

    // --------------------------------------------------
    // event (SOURCE OF EVENT NAME)
    // --------------------------------------------------
    {
      $lookup: {
        from: "coachevents",
        localField: "event",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },

    // --------------------------------------------------
    // resolve team id
    // --------------------------------------------------
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

    // --------------------------------------------------
    // team lookup
    // --------------------------------------------------
    {
      $lookup: {
        from: "teams",
        localField: "teamIdForLookup",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    // --------------------------------------------------
    // coach lookup (FIXES createdByName BUG)
    // --------------------------------------------------
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
      },
    },

    // --------------------------------------------------
    // GROUP BY TEAM + EVENT (EVENT NAME FIXED)
    // --------------------------------------------------
    {
      $group: {
        _id: {
          teamId: "$team._id",
          teamName: "$team.teamName",
          teamSlug: "$team.teamSlug",
          eventId: "$event._id",
          eventName: "$event.name", // ✅ CORRECT FIELD
          eventStartDate: "$event.startDate",
        },
        latestDate: { $max: "$createdAt" },
        count: { $sum: 1 },
        notes: {
          $push: {
            _id: "$_id",
            createdAt: "$createdAt",
            coachName: "$coachName",
            opponent: "$opponent.name",
            result: "$result",
            score: "$score",
          },
        },
      },
    },

    // --------------------------------------------------
    // sort notes
    // --------------------------------------------------
    {
      $addFields: {
        notes: {
          $sortArray: { input: "$notes", sortBy: { createdAt: -1 } },
        },
      },
    },

    // --------------------------------------------------
    // regroup by team
    // --------------------------------------------------
    {
      $group: {
        _id: {
          teamId: "$_id.teamId",
          teamName: "$_id.teamName",
          teamSlug: "$_id.teamSlug",
        },
        latestDate: { $max: "$latestDate" },
        count: { $sum: "$count" },
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

    {
      $project: {
        _id: 0,
        teamId: "$_id.teamId",
        teamName: "$_id.teamName",
        teamSlug: "$_id.teamSlug",
        latestDate: 1,
        count: 1,
        events: 1,
      },
    },
  ];

  try {
    const teams = await CoachMatchNote.aggregate(pipeline);

    return NextResponse.json(
      {
        ok: true,
        teams: teams.map((t) => ({
          ...t,
          teamId: t.teamId ? String(t.teamId) : null,
          events: t.events.map((e) => ({
            ...e,
            eventId: e.eventId ? String(e.eventId) : null,
            notes: e.notes.map((n) => ({
              ...n,
              _id: String(n._id),
            })),
          })),
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Family coach notes aggregation error:", err);
    return NextResponse.json(
      { error: "Failed to load family coach notes" },
      { status: 500 }
    );
  }
}
