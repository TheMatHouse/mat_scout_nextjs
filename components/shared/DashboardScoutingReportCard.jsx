"use client";

import moment from "moment";
import { Eye, Edit, Trash, Share2, Video } from "lucide-react";

function normalizeWeightDisplay(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";

  // collapse duplicate unit like: "73 kg kg" -> "73 kg"
  return s
    .replace(/\b(kg)\s+\1\b/gi, "kg")
    .replace(/\b(lb|lbs)\s+\1\b/gi, (m) => m.split(/\s+/)[0]);
}

function DashboardScoutingReportCard({
  report,
  onView,
  onEdit,
  onDelete,
  onShare,
}) {
  if (!report) return null;

  const hasVideo = Array.isArray(report.videos) && report.videos.length > 0;

  const stylePill =
    report.matchType && String(report.matchType).trim()
      ? String(report.matchType).trim()
      : "";

  const athleteName = [
    report.athleteFirstName,
    report.athleteLastName,
    report.athleteDisplay, // fallback if your shared route formats this
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const country =
    report.athleteCountry || report.countryDisplay || report.country || "";

  const divisionDisplay = report.divisionDisplay || "";
  const weightDisplay = normalizeWeightDisplay(report.weightDisplay || "");

  return (
    <div className="relative bg-gray-900 text-white p-4 rounded-xl shadow-md border border-gray-700">
      {/* Action rail */}
      {(onView || onEdit || onDelete || onShare) && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {onView && (
            <button
              type="button"
              onClick={onView}
              title="View"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-blue-400 hover:bg-gray-700"
            >
              <Eye size={18} />
            </button>
          )}

          {hasVideo && (
            <div
              title="Has video"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-cyan-400"
            >
              <Video size={18} />
            </div>
          )}

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              title="Share"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-purple-400 hover:bg-gray-700"
            >
              <Share2 size={18} />
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Edit"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-green-400 hover:bg-gray-700"
            >
              <Edit size={18} />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-600 bg-gray-800 text-red-400 hover:bg-gray-700"
            >
              <Trash size={18} />
            </button>
          )}
        </div>
      )}

      {/* Top row */}
      <div className="flex items-center justify-between gap-3 pr-16">
        <div className="inline-flex items-center gap-2">
          {stylePill && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs border border-gray-600 text-gray-100">
              {stylePill}
            </span>
          )}

          {hasVideo && (
            <span
              title="Has video"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border border-gray-600 text-gray-100"
            >
              <Video size={14} />
              Video
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 pr-16 text-right text-sm text-gray-100">
        {report.matchDate ? moment(report.matchDate).format("MMM D, YYYY") : ""}
      </div>

      {/* Athlete */}
      {athleteName && (
        <div className="mt-3">
          <div className="text-sm text-gray-100">Athlete</div>
          <div className="text-base font-semibold text-gray-100">
            {athleteName}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {country && (
          <div>
            <div className="text-sm text-gray-100">Country</div>
            <div className="text-base font-medium text-gray-100">{country}</div>
          </div>
        )}

        {divisionDisplay && (
          <div>
            <div className="text-sm text-gray-100">Division</div>
            <div className="text-base font-medium text-gray-100">
              {divisionDisplay}
            </div>
          </div>
        )}

        {report.eventName && (
          <div>
            <div className="text-sm text-gray-100">Event</div>
            <div className="text-base font-medium text-gray-100">
              {report.eventName}
            </div>
          </div>
        )}

        {weightDisplay && (
          <div>
            <div className="text-sm text-gray-100">Weight</div>
            <div className="text-base font-medium text-gray-100">
              {weightDisplay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardScoutingReportCard;
