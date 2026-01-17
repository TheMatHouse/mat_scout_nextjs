// components/shared/PreviewReportModal.jsx
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
const safeStr = (v, fallback = "") => (v == null ? fallback : String(v).trim());

const isObjectId = (v) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);

const genderLabel = (g) => {
  const s = safeStr(g).toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
};

const computeDivisionDisplay = (division) => {
  if (!division) return "";
  if (typeof division === "string") {
    // If it's just a Mongo ObjectId string, do NOT display it.
    return isObjectId(division) ? "" : division;
  }
  if (typeof division === "object") {
    const label =
      safeStr(division?.label) ||
      safeStr(division?.name) ||
      safeStr(division?.code);
    const glab = genderLabel(division?.gender);
    if (label) return glab ? `${label} — ${glab}` : label;
  }
  return "";
};

/** Convert common YouTube/Vimeo sources to embeddable URL; fall back to raw URL. */
function toEmbedUrl(urlRaw, startSeconds = 0) {
  if (!urlRaw) return "";
  let url = safeStr(urlRaw);

  // If user pasted a full <iframe ... src="...">, extract the src URL
  if (/<iframe[\s\S]*?>/i.test(url)) {
    const srcMatch =
      url.match(/src\s*=\s*"(.*?)"/i) || url.match(/src\s*=\s*'(.*?)'/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1];
    }
  }

  // YouTube patterns
  const ytIdMatch =
    url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i) ||
    url.match(/youtube\.com\/shorts\/([^?]+)/i);
  if (ytIdMatch && ytIdMatch[1]) {
    const base = `https://www.youtube.com/embed/${ytIdMatch[1]}`;
    const start = Math.max(0, parseInt(startSeconds || 0, 10)) || 0;
    return start ? `${base}?start=${start}` : base;
  }

  // Vimeo embed (already)
  if (/player\.vimeo\.com\/video\//i.test(url)) return url;

  // Otherwise, return as-is (best effort)
  return url;
}

/** Normalize any video shapes into [{title, notes, url, embedUrl}] */
function normalizeVideos(report) {
  const out = [];

  // Array on report.videos (new structure, expected after populate)
  if (Array.isArray(report?.videos)) {
    for (const v of report.videos) {
      if (!v) continue;
      const title = safeStr(v.title ?? v.videoTitle);
      const notes = safeStr(v.notes ?? v.videoNotes);
      const url = safeStr(v.url ?? v.urlCanonical ?? v.videoURL);
      const startSeconds = Math.max(0, parseInt(v?.startSeconds || 0, 10));
      const embedUrl = toEmbedUrl(url, startSeconds);
      if (embedUrl) out.push({ title, notes, url, embedUrl });
    }
  }

  // Legacy single nested video fields on the report (optional)
  const legacyUrl = safeStr(report?.video?.videoURL ?? report?.videoURL);
  if (legacyUrl) {
    const embedUrl = toEmbedUrl(legacyUrl);
    out.push({
      title: safeStr(report?.video?.videoTitle ?? report?.videoTitle),
      notes: safeStr(report?.video?.videoNotes ?? report?.videoNotes),
      url: legacyUrl,
      embedUrl,
    });
  }

  // de-dupe by embedUrl
  const seen = new Set();
  return out.filter((v) => {
    if (!v.embedUrl) return false;
    const key = v.embedUrl.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const Info = ({ label, value }) => {
  const val = safeStr(value);
  if (!val) return null;
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-gray-700 dark:text-gray-300 font-medium">
        {label}:
      </span>
      <span className="text-gray-900 dark:text-white font-semibold text-right">
        {val}
      </span>
    </div>
  );
};

const PreviewReportModal = ({
  previewOpen,
  setPreviewOpen,
  report,
  reportType, // "match" | "scouting"
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
    // Prefer populated division object -> then divisionDisplay (unless it's an ObjectId) -> then compute fallback
    const divisionFromObject = computeDivisionDisplay(report?.division);
    const divisionDisplaySnapshot = !isObjectId(report?.divisionDisplay)
      ? safeStr(report?.divisionDisplay)
      : "";
    const divisionDisplay = divisionFromObject || divisionDisplaySnapshot || "";

    // Prefer saved snapshot label for weight
    const weightLabel = safeStr(report?.weightLabel);
    const weightUnit = safeStr(report?.weightUnit);
    const weightDisplayBase =
      weightLabel ||
      safeStr(
        report?.weightCategoryLabel ||
          report?.weightCategory?.label ||
          report?.weightCategory?.name ||
          report?.weightCategory
      );
    const weightDisplay =
      weightDisplayBase &&
      weightUnit &&
      !/\b(kg|lb)s?\b/i.test(weightDisplayBase)
        ? `${weightDisplayBase} ${weightUnit}`
        : weightDisplayBase || "";

    return {
      divisionDisplay,
      weightDisplay,
      eventDateDisplay: report?.matchDate
        ? moment.utc(report.matchDate).format("MMMM D, YYYY")
        : "—",
      resultDisplay: safeStr(report?.result) || "—",
      scoreDisplay: safeStr(report?.score) || "—",
      createdByDisplay: safeStr(report?.createdByName) || "—",
      isPublicDisplay: report?.isPublic ? "Yes" : "No",
      opponentTechs: Array.isArray(report?.opponentAttacks)
        ? report.opponentAttacks
        : [],
      athleteTechs: Array.isArray(report?.athleteAttacks)
        ? report.athleteAttacks
        : [],
      videos: normalizeVideos(report),
    };
  }, [report]);

  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent
        ref={dialogContentRef}
        className="overflow-y-auto max-h-screen sm:w-11/12 max-w-6xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {reportType === "match" ? "Match Report" : "Scouting Report"}
            </DialogTitle>
          </div>
          <DialogDescription className="px-4 py-2 text-gray-900 dark:text-gray-100 rounded-md">
            View detailed {reportType === "match" ? "match" : "scouting"} report
            including context, opponent info, techniques, and video(s).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 px-2 text-sm sm:text-base">
          {/* LEFT COLUMN – All data */}
          <div className="space-y-6">
            {/* ===== Match/Scouting Details ===== */}
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                {reportType === "match" ? "Match Details" : "Report Details"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info
                  label="Match Type"
                  value={safeStr(report?.matchType)}
                />
                <Info
                  label="Event"
                  value={safeStr(report?.eventName)}
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

            {/* ===== Opponent / Athlete Info ===== */}
            <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                Opponent & Athlete
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Info
                  label="Opponent Name"
                  value={safeStr(report?.opponentName)}
                />
                <Info
                  label="Opponent Country"
                  value={safeStr(report?.opponentCountry)}
                />
                <Info
                  label="Opponent Club"
                  value={safeStr(report?.opponentClub)}
                />
                <Info
                  label="Opponent Rank"
                  value={safeStr(report?.opponentRank)}
                />
                <Info
                  label="Opponent Grip/Stance"
                  value={safeStr(report?.opponentGrip)}
                />
                <Info
                  label="My Rank (at match)"
                  value={safeStr(report?.myRank)}
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
                      <li key={`opp-${i}`}>{safeStr(a)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opponent notes */}
              {safeStr(report?.opponentAttackNotes) && (
                <div className="mt-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Opponent Notes
                  </h4>
                  <div
                    className="prose dark:prose-invert max-w-none text-sm"
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
                      <li key={`me-${i}`}>{safeStr(a)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Athlete notes */}
              {safeStr(report?.athleteAttackNotes) && (
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
          </div>

          {/* RIGHT COLUMN – Video */}
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
              {derived.videos.length > 1 ? "Match Videos" : "Match Video"}
            </h3>

            {derived.videos.length ? (
              <div className="space-y-6">
                {derived.videos.map((v, i) => (
                  <div
                    key={v.embedUrl + i}
                    className="space-y-3"
                  >
                    {!!safeStr(v.title) && (
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                        {safeStr(v.title)}
                      </h4>
                    )}

                    {!!safeStr(v.notes) && (
                      <div
                        className="prose dark:prose-invert max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: v.notes }}
                      />
                    )}

                    <div className="aspect-video w-full rounded-lg shadow overflow-hidden">
                      <iframe
                        className="w-full h-full"
                        src={v.embedUrl}
                        title={safeStr(v.title) || `Video ${i + 1}`}
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
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
