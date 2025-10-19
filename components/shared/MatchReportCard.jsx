// components/shared/MatchReportCard.jsx
"use client";

import moment from "moment";
import { Eye, Edit, Trash } from "lucide-react";

/**
 * Mobile match/scouting card with optional action rail.
 *
 * Props:
 *  - match: {
 *      _id, matchType, result, score, matchDate, opponentName,
 *      eventName, divisionDisplay, method, weightDisplay,
 *      myRank, opponentRank
 *    }
 *  - personLabel?: string  // defaults to "Opponent"; use "Athlete" for scouting
 *  - onView?:  (match) => void
 *  - onEdit?:  (match) => void
 *  - onDelete?:(match) => void
 */
export default function MatchReportCard({
  match,
  onView,
  onEdit,
  onDelete,
  personLabel = "Opponent",
}) {
  if (!match) return null;

  const isWin = String(match?.result || "")
    .trim()
    .toUpperCase()
    .startsWith("W");
  const resultPill =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
    (isWin ? "bg-emerald-700 text-emerald-50" : "bg-rose-700 text-rose-50");

  return (
    <div className="relative bg-gray-900 text-white p-4 rounded-xl shadow-md border border-gray-700">
      {/* Action rail (optional) */}
      {(onView || onEdit || onDelete) && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {onView && (
            <button
              onClick={() => onView(match)}
              title="View Details"
              className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-blue-400 hover:bg-slate-700"
            >
              <Eye size={18} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(match)}
              title="Edit"
              className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-green-400 hover:bg-slate-700"
            >
              <Edit size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(match)}
              title="Delete"
              className="h-9 w-9 grid place-items-center rounded-lg border border-slate-600 bg-slate-800/70 text-red-400 hover:bg-slate-700"
            >
              <Trash size={18} />
            </button>
          )}
        </div>
      )}

      {/* Top row: style + result (reserve space for rail with pr-16) */}
      <div className="flex items-center justify-between gap-3 pr-16">
        <div className="inline-flex items-center gap-2">
          {match.matchType ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border border-gray-600/60 text-gray-100">
              {match.matchType}
            </span>
          ) : null}
          {match.result ? (
            <span className={resultPill}>
              {match.result}
              {match.score ? ` • ${match.score}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* Date row */}
      <div className="mt-1 pr-16 text-right">
        <span className="text-xs font-medium text-gray-300">
          {match.matchDate ? moment(match.matchDate).format("MMM D, YYYY") : ""}
        </span>
      </div>

      {/* Primary name */}
      {match.opponentName ? (
        <div className="mt-3">
          <div className="text-sm text-gray-300">{personLabel}</div>
          <div className="text-base font-semibold text-gray-100">
            {match.opponentName}
          </div>
        </div>
      ) : null}

      {/* Meta grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {match.eventName ? (
          <div>
            <div className="text-xs text-gray-300">Event</div>
            <div className="text-sm font-medium text-gray-100">
              {match.eventName}
            </div>
          </div>
        ) : null}
        {match.divisionDisplay ? (
          <div>
            <div className="text-xs text-gray-300">Division</div>
            <div className="text-sm font-medium text-gray-100">
              {match.divisionDisplay}
            </div>
          </div>
        ) : null}
        {match.method ? (
          <div>
            <div className="text-xs text-gray-300">Method</div>
            <div className="text-sm font-medium text-gray-100">
              {match.method}
            </div>
          </div>
        ) : null}
        {match.weightDisplay ? (
          <div>
            <div className="text-xs text-gray-300">Weight</div>
            <div className="text-sm font-medium text-gray-100">
              {match.weightDisplay}
            </div>
          </div>
        ) : null}
      </div>

      {(match.myRank || match.opponentRank) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {match.myRank ? (
            <div>
              <div className="text-xs text-gray-300">My Rank</div>
              <div className="text-sm font-medium text-gray-100">
                {match.myRank}
              </div>
            </div>
          ) : null}
          {match.opponentRank ? (
            <div>
              <div className="text-xs text-gray-300">Opponent Rank</div>
              <div className="text-sm font-medium text-gray-100">
                {match.opponentRank}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
