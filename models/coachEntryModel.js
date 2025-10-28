// models/coachEntryModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

/**
 * CoachEntry
 * - One document per athlete added to an event (per team).
 * - Athlete can be:
 *   1) a User (athlete.user set),
 *   2) a FamilyMember (athlete.familyMember set), or
 *   3) a guest (neither set; identified by athlete.name).
 */

const AthleteSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    familyMember: {
      type: Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },

    // keep a tiny snapshot for list views/exports
    club: { type: String, default: "" },
  },
  { _id: false }
);

const CoachEntrySchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "CoachEvent",
      required: true,
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    athlete: { type: AthleteSchema, required: true },

    notesCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * De-dupe guarantees within an event:
 *  - A given User may appear at most once for the event
 *  - A given FamilyMember may appear at most once for the event
 *  - A guest-by-name may appear at most once for the event
 * All ignore soft-deleted rows (deletedAt != null).
 */

// users (athlete.user != null)
CoachEntrySchema.index(
  { event: 1, "athlete.user": 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null, "athlete.user": { $ne: null } },
    name: "uniq_event_user",
  }
);

// family members (athlete.familyMember != null)
CoachEntrySchema.index(
  { event: 1, "athlete.familyMember": 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      "athlete.familyMember": { $ne: null },
    },
    name: "uniq_event_familyMember",
  }
);

// guests (no user/familyMember; unique by normalized name)
CoachEntrySchema.index(
  {
    event: 1,
    "athlete.name": 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      "athlete.user": null,
      "athlete.familyMember": null,
    },
    name: "uniq_event_guest_name",
  }
);

// helpful secondary
CoachEntrySchema.index({ event: 1, team: 1 }, { name: "event_team" });

const CoachEntry = models.CoachEntry || model("CoachEntry", CoachEntrySchema);
export default CoachEntry;
