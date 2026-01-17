"use client";

import moment from "moment";
import { Eye, Edit, Trash, Share2 } from "lucide-react";

const MatchReportCard = ({
  match,
  onView,
  onEdit,
  onDelete,
  onShare,
  personLabel = "Opponent",
}) => {
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
      {/* Action rail */}
      {(onView || onEdit || onDelete || onShare) && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {onView && (
            <button
              onClick={() => onView(match)}
              title="View"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-blue-400 hover:bg-gray-700"
            >
              <Eye size={18} />
            </button>
          )}

          {onShare && (
            <button
              onClick={() => onShare(match)}
              title="Share"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-purple-400 hover:bg-gray-700"
            >
              <Share2 size={18} />
            </button>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(match)}
              title="Edit"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-green-400 hover:bg-gray-700"
            >
              <Edit size={18} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(match)}
              title="Delete"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-red-400 hover:bg-gray-700"
            >
              <Trash size={18} />
            </button>
          )}
        </div>
      )}

      {/* Top */}
      <div className="flex items-center justify-between gap-3 pr-16">
        <div className="inline-flex items-center gap-2">
          {match.matchType && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-gray-600 text-gray-100">
              {match.matchType}
            </span>
          )}
          {match.result && (
            <span className={resultPill}>
              {match.result}
              {match.score ? ` • ${match.score}` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 pr-16 text-right text-sm text-gray-100">
        {match.matchDate ? moment(match.matchDate).format("MMM D, YYYY") : ""}
      </div>

      {match.opponentName && (
        <div className="mt-3">
          <div className="text-sm text-gray-100">{personLabel}</div>
          <div className="text-base font-semibold text-gray-100">
            {match.opponentName}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {match.eventName && (
          <div>
            <div className="text-sm text-gray-100">Event</div>
            <div className="text-base font-medium text-gray-100">
              {match.eventName}
            </div>
          </div>
        )}

        {match.divisionDisplay && (
          <div>
            <div className="text-sm text-gray-100">Division</div>
            <div className="text-base font-medium text-gray-100">
              {match.divisionDisplay}
            </div>
          </div>
        )}

        {match.method && (
          <div>
            <div className="text-sm text-gray-100">Method</div>
            <div className="text-base font-medium text-gray-100">
              {match.method}
            </div>
          </div>
        )}

        {match.weightDisplay && (
          <div>
            <div className="text-sm text-gray-100">Weight</div>
            <div className="text-base font-medium text-gray-100">
              {match.weightDisplay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchReportCard;
