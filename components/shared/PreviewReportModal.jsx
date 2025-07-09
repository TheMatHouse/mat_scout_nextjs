"use client";

import React, { useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PreviewReportModal = ({ previewOpen, setPreviewOpen, report }) => {
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

  const extractYouTubeID = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  return (
    <>
      <Dialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      >
        <DialogContent
          ref={dialogContentRef}
          className="overflow-y-auto max-h-screen sm:w-11/12 max-w-6xl"
        >
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Scouting Report – {report?.athleteFirstName || ""}{" "}
                {report?.athleteLastName || ""}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-2 text-sm sm:text-base">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                Athlete Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    First Name
                  </span>
                  <span>{report.athleteFirstName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Last Name
                  </span>
                  <span>{report.athleteLastName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Country
                  </span>
                  <span>{report.athleteCountry}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    National Rank
                  </span>
                  <span>{report.athleteNationalRank}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    World Rank
                  </span>
                  <span>{report.athleteWorldRank}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Club
                  </span>
                  <span>{report.athleteClub}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Division
                  </span>
                  <span>{report.division}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Weight Class
                  </span>
                  <span>{report.weightCategory}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Grip/Stance
                  </span>
                  <span>{report.athleteGrip}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Match Type
                  </span>
                  <span>{report.matchType}</span>
                </div>
              </div>

              {report.athleteAttacks?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Athlete's Attacks:
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
                    Athlete Notes:
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

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                Videos
              </h3>
              {Array.isArray(report.videos) && report.videos.length > 0 ? (
                <div className="space-y-6">
                  {report.videos.map((video, i) => (
                    <div
                      key={i}
                      className="space-y-2"
                    >
                      {video.title && (
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                          {video.title}
                        </h4>
                      )}
                      {video.notes && (
                        <div
                          className="prose dark:prose-invert text-sm"
                          dangerouslySetInnerHTML={{ __html: video.notes }}
                        />
                      )}
                      {video.url && (
                        <div className="aspect-video w-full rounded-lg shadow overflow-hidden">
                          <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${extractYouTubeID(
                              video.url
                            )}`}
                            title={video.title || `Video ${i + 1}`}
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="italic text-gray-500 dark:text-gray-400">
                  No videos provided.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PreviewReportModal;
