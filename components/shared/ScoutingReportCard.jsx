"use client";

import { Eye, Edit, Trash, Video } from "lucide-react";

function ScoutingReportCard({ report, onView, onEdit, onDelete }) {
  if (!report) return null;

  const hasVideo = Array.isArray(report.videos) && report.videos.length > 0;

  return (
    <div className="relative rounded-xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
      {/* Action buttons */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        {onView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onView();
            }}
            title="View"
            className="h-9 w-9 rounded-lg border border-border bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eye size={18} />
          </button>
        )}

        {hasVideo && (
          <div
            title="Has video"
            className="h-9 w-9 rounded-lg border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-blue-500"
          >
            <Video size={18} />
          </div>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            title="Edit"
            className="h-9 w-9 rounded-lg border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-green-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Edit size={18} />
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
            className="h-9 w-9 rounded-lg border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Trash size={18} />
          </button>
        )}
      </div>

      {/* Report For */}
      {report.reportForDisplay && (
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Report For
          </div>
          <div className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {report.reportForDisplay}
          </div>
        </div>
      )}

      {/* Athlete */}
      {report.athleteDisplay && (
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Athlete
          </div>
          <div className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {report.athleteDisplay}
          </div>
        </div>
      )}

      {/* Country */}
      {report.countryDisplay && (
        <div className="mb-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Country
          </div>
          <div className="text-sm font-normal text-gray-900 dark:text-gray-100">
            {report.countryDisplay}
          </div>
        </div>
      )}

      {/* Division + Weight */}
      <div className="grid grid-cols-2 gap-3">
        {report.divisionDisplay && (
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Division
            </div>
            <div className="text-sm font-normal text-gray-900 dark:text-gray-100">
              {report.divisionDisplay}
            </div>
          </div>
        )}

        {report.weightDisplay && (
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Weight
            </div>
            <div className="text-sm font-normal text-gray-900 dark:text-gray-100">
              {report.weightDisplay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoutingReportCard;
