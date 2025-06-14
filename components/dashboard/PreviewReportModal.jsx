import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useEffect, useRef } from "react";

const PreviewReportModal = ({
  previewOpen,
  setPreviewOpen,
  report,
  reportType,
}) => {
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
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-2 text-sm sm:text-base">
          {/* Opponent Info + Attacks */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              Opponent Information
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Info
                label="Name"
                value={report.opponentName}
              />
              <Info
                label="Country"
                value={report.opponentCountry}
              />
              <Info
                label="National Rank"
                value={report.opponentNationalRank}
              />
              <Info
                label="World Rank"
                value={report.opponentWorldRank}
              />
              <Info
                label="Match Type"
                value={report.matchType}
              />
              <Info
                label="Division"
                value={report.division}
              />
              <Info
                label="Weight Class"
                value={report.weightCategory}
              />
              <Info
                label="Rank"
                value={report.opponentRank}
              />
              <Info
                label="Grip/Stance"
                value={report.opponentGrip}
              />
            </div>

            {report?.opponentAttacks?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  Opponent's Attacks Used:
                </h4>
                <ul className="list-disc list-inside ml-2 text-sm mt-1">
                  {report.opponentAttacks.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.opponentAttackNotes && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  Opponent Notes:
                </h4>
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: report.opponentAttackNotes,
                  }}
                />
              </div>
            )}

            {report?.athleteAttacks?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  My Attacks Used:
                </h4>
                <ul className="list-disc list-inside ml-2 text-sm mt-1">
                  {report.athleteAttacks.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.athleteAttackNotes && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  My Notes:
                </h4>
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: report.athleteAttackNotes,
                  }}
                />
              </div>
            )}
          </div>

          {/* Match Video */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              Match Video
            </h3>
            {report?.video?.videoURL ? (
              <div className="space-y-4">
                {report.video.videoTitle && (
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                    {report.video.videoTitle}
                  </h4>
                )}
                <div className="aspect-video w-full rounded-lg shadow overflow-hidden">
                  <iframe
                    className="w-full h-full"
                    src={report.video.videoURL}
                    title={report.video.videoTitle}
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <p className="italic text-gray-500 dark:text-gray-400">
                No video provided.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Info = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-700 dark:text-gray-300 font-medium">
        {label}:
      </span>
      <span className="text-gray-900 dark:text-white font-semibold">
        {value}
      </span>
    </div>
  );
};

export default PreviewReportModal;
