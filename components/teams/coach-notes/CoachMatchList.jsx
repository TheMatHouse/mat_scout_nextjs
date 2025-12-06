"use client";

import React from "react";
import EditCoachMatchModalButton from "./forms/EditCoachMatchModalButton";
import RemoveEntryButton from "./forms/RemoveEntryButton";

const CoachMatchList = ({ matches = [], slug, eventId }) => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return (
      <div className="text-gray-700 dark:text-gray-300">
        No matches added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <div
          key={m._id}
          className="rounded-xl border bg-[var(--color-card)] p-4 shadow-sm space-y-2"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {m.athleteName || "Unknown Athlete"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {m.opponentName ? `vs. ${m.opponentName}` : "Match"}
              </p>
            </div>

            <div className="flex gap-2">
              <EditCoachMatchModalButton
                slug={slug}
                eventId={eventId}
                match={m}
              />

              <RemoveEntryButton
                slug={slug}
                eventId={eventId}
                entryId={m._id}
              />
            </div>
          </div>

          {m.notes && (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {m.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default CoachMatchList;
