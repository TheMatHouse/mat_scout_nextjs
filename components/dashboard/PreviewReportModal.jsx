// components/dashboard/PreviewReportModal.jsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useEffect, useMemo, useRef } from "react";
import moment from "moment";

/* ---------- tiny helpers ---------- */
const safe = (v) => (v == null || v === "" ? "" : String(v));
const divName = (report) =>
  (report?.division &&
    typeof report.division === "object" &&
    report.division.name) ||
  (typeof report?.division === "string" ? report.division : "") ||
  "";
const weightDisplay = (report) => {
  if (report?.weightLabel) {
    return `${report.weightLabel}${
      report.weightUnit ? ` ${report.weightUnit}` : ""
    }`;
  }
  // legacy: plain string
  if (typeof report?.weightCategory === "string" && report.weightCategory) {
    return report.weightCategory;
  }
  return "";
};
const videoUrl = (report) => report?.video?.videoURL || report?.videoURL || "";
const videoTitle = (report) =>
  report?.video?.videoTitle || report?.videoTitle || "";

const Info = ({ label, value }) => {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-gray-700 dark:text-gray-300 font-medium">
        {label}:
      </span>
      <span className="text-gray-900 dark:text-white font-semibold text-right">
        {value}
      </span>
    </div>
  );
};

const PreviewReportModal = ({
  previewOpen,
  setPreviewOpen,
  report,
  reportType,
}) => {
  if (!report) return null;

  const dialogContentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dialogContentRef.current &&
        !dialogContentRef.current.contains(event.target)
      ) {
        setPreviewOpen(false);
      }
    };
    if (previewOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [previewOpen, setPreviewOpen]);

  const derived = useMemo(() => {
    return {
      divisionDisplay: divName(report) || "—",
      weightDisplay: weightDisplay(report) || "—",
      eventDateDisplay: report?.matchDate
        ? moment.utc(report.matchDate).format("MMMM D, YYYY")
        : "—",
      resultDisplay: report?.result || "—",
      scoreDisplay: report?.score || "—",
      createdByDisplay: report?.createdByName || "—",
      isPublicDisplay: report?.isPublic ? "Yes" : "No",
      opponentTechs: Array.isArray(report?.opponentAttacks)
        ? report.opponentAttacks
        : [],
      athleteTechs: Array.isArray(report?.athleteAttacks)
        ? report.athleteAttacks
        : [],
      videoURL: videoUrl(report),
      videoTitle: videoTitle(report),
    };
  }, [report]);

  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent
        ref={dialogContentRef}
        className="overflow-y-auto max-h-screen sm:w-11/12 max-w-6xl"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {reportType === "match" ? "Match Report" : "Scouting Report"}
            </DialogTitle>
          </div>
          <DialogDescription>
            View detailed match report including match context, opponent info,
            techniques, and video.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 px-2 text-sm sm:text-base">
          {/* ===== Match Details ===== */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              Match Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info
                label="Match Type"
                value={safe(report.matchType)}
              />
              <Info
                label="Event"
                value={safe(report.eventName)}
              />
              <Info
                label="Date"
                value={derived.eventDateDisplay}
              />
              <Info
                label="Created By"
                value={derived.createdByDisplay}
              />
              <Info
                label="Division"
                value={derived.divisionDisplay}
              />
              <Info
                label="Weight Class"
                value={derived.weightDisplay}
              />
              <Info
                label="Result"
                value={derived.resultDisplay}
              />
              <Info
                label="Score"
                value={derived.scoreDisplay}
              />
              <Info
                label="Public"
                value={derived.isPublicDisplay}
              />
            </div>
          </section>

          {/* ===== Opponent / Athlete Info & Techniques ===== */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              Opponent & Athlete
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info
                label="Opponent Name"
                value={safe(report.opponentName)}
              />
              <Info
                label="Opponent Country"
                value={safe(report.opponentCountry)}
              />
              <Info
                label="Opponent Club"
                value={safe(report.opponentClub)}
              />
              <Info
                label="Opponent Rank"
                value={safe(report.opponentRank)}
              />
              <Info
                label="Opponent Grip/Stance"
                value={safe(report.opponentGrip)}
              />
              <Info
                label="My Rank (at match)"
                value={safe(report.myRank)}
              />
            </div>

            {/* Opponent techs */}
            {derived.opponentTechs.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  Opponent’s Techniques Used
                </h4>
                <ul className="list-disc list-inside ml-2 text-sm mt-1">
                  {derived.opponentTechs.map((a, i) => (
                    <li key={`opp-${i}`}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opponent notes (HTML) */}
            {report.opponentAttackNotes && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  Opponent Notes
                </h4>
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  // Ensure this HTML comes from your own Editor control (trusted source)
                  dangerouslySetInnerHTML={{
                    __html: report.opponentAttackNotes,
                  }}
                />
              </div>
            )}

            {/* Athlete techs */}
            {derived.athleteTechs.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  My Techniques Used
                </h4>
                <ul className="list-disc list-inside ml-2 text-sm mt-1">
                  {derived.athleteTechs.map((a, i) => (
                    <li key={`me-${i}`}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Athlete notes (HTML) */}
            {report.athleteAttackNotes && (
              <div className="mt-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  My Notes
                </h4>
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: report.athleteAttackNotes,
                  }}
                />
              </div>
            )}
          </section>

          {/* ===== Video (right column) ===== */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6 lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              Match Video
            </h3>
            {derived.videoURL ? (
              <div className="space-y-4">
                {derived.videoTitle && (
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                    {derived.videoTitle}
                  </h4>
                )}
                <div className="aspect-video w-full rounded-lg shadow overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src={derived.videoURL}
                    title={derived.videoTitle || "Match Video"}
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <p className="italic text-gray-500 dark:text-gray-400">
                No video provided.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewReportModal;
