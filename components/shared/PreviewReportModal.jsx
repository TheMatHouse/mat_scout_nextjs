"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPrimitive,
  DialogDescription,
} from "@/components/ui/dialog";

/* ---------------- helpers ---------------- */
const s = (v) => (v == null ? "" : String(v).trim());

const genderLabel = (g) => {
  const x = s(g).toLowerCase();
  if (x === "male") return "Men";
  if (x === "female") return "Women";
  if (x === "coed" || x === "open") return "Coed";
  return s(g);
};

const isLikelyObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(s(value));

const computeDivisionDisplay = (division, report) => {
  const reportDisplay = s(report?.divisionDisplay) || s(report?.divisionLabel);
  if (reportDisplay) return reportDisplay;

  if (!division) return "—";

  if (typeof division === "string") {
    const txt = s(division);
    if (!txt || isLikelyObjectId(txt)) return "—";
    return txt;
  }

  if (typeof division === "object") {
    const name = s(division?.label || division?.name);
    const glab = genderLabel(division?.gender);
    return name ? (glab ? `${name} — ${glab}` : name) : "—";
  }

  return "—";
};

const computeWeightDisplay = (report) => {
  const label = s(report?.weightLabel);
  const unit = s(report?.weightUnit);
  if (label) {
    if (/\b(kg|lb)s?\b/i.test(label) || !unit) return label;
    return `${label} ${unit}`;
  }

  const cat =
    s(report?.weightCategoryLabel) ||
    (typeof report?.weightCategory === "object"
      ? s(report?.weightCategory?.label || report?.weightCategory?.name)
      : s(report?.weightCategory));

  if (cat) {
    if (/\b(kg|lb)s?\b/i.test(cat) || !unit) return cat;
    return `${cat} ${unit}`;
  }
  return "—";
};

const extractUrlFromMaybeIframe = (raw) => {
  let url = s(raw);
  if (!url) return "";
  if (/<iframe[\s\S]*?>/i.test(url)) {
    const m =
      url.match(/src\s*=\s*"(.*?)"/i) || url.match(/src\s*=\s*'(.*?)'/i);
    if (m && m[1]) url = m[1];
  }
  return url;
};

const toEmbedUrl = (rawUrl, startSeconds = 0) => {
  const url = extractUrlFromMaybeIframe(rawUrl);
  if (!url) return "";

  const ytIdMatch =
    url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i) ||
    url.match(/youtube\.com\/shorts\/([^?]+)/i);
  if (ytIdMatch && ytIdMatch[1]) {
    const base = `https://www.youtube.com/embed/${ytIdMatch[1]}`;
    const start = Math.max(0, parseInt(startSeconds || 0, 10)) || 0;
    return start ? `${base}?start=${start}` : base;
  }

  if (/player\.vimeo\.com\/video\//i.test(url)) return url;
  return url;
};

const getFields = (report, reportType) => {
  const resolvedNotesHtml =
    s(report?.decryptedAthleteAttackNotesHtml) ||
    s(report?.decryptedAthleteAttackNotes) ||
    s(report?.athleteAttackNotesHtml) ||
    s(report?.athleteAttackNotes);

  return {
    firstName: s(report?.athleteFirstName),
    lastName: s(report?.athleteLastName),
    country: s(report?.athleteCountry),
    nationalRank: s(report?.athleteNationalRank),
    worldRank: s(report?.athleteWorldRank),
    club: s(report?.athleteClub),
    grip: s(report?.athleteGrip),
    attacks: Array.isArray(report?.athleteAttacks) ? report.athleteAttacks : [],
    notesHtml: resolvedNotesHtml,
  };
};

/* -------------- component -------------- */
const PreviewReportModal = ({
  previewOpen,
  setPreviewOpen,
  report,
  reportType = "scouting",
}) => {
  const dialogContentRef = useRef(null);

  const {
    firstName,
    lastName,
    country,
    nationalRank,
    worldRank,
    club,
    grip,
    attacks,
    notesHtml,
  } = useMemo(() => getFields(report, reportType), [report, reportType]);

  const divisionDisplay = useMemo(
    () => computeDivisionDisplay(report?.division, report),
    [report]
  );

  const weightDisplay = useMemo(() => computeWeightDisplay(report), [report]);

  const videos = Array.isArray(report?.videos) ? report.videos : [];
  const decryptedVideoNotes = Array.isArray(report?.decryptedVideoNotes)
    ? report.decryptedVideoNotes
    : [];

  return (
    <Dialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background dark:bg-gray-950">
        <div
          ref={dialogContentRef}
          className="space-y-6"
        >
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {reportType === "match" ? "Match Report" : "Scouting Report"} –{" "}
                {firstName || "—"} {lastName || ""}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 px-2 text-sm sm:text-base">
            {/* ATHLETE INFO */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                Athlete Information
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    First Name
                  </span>
                  <span>{firstName || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Last Name
                  </span>
                  <span>{lastName || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Country
                  </span>
                  <span>{country || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    National Rank
                  </span>
                  <span>{nationalRank || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    World Rank
                  </span>
                  <span>{worldRank || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Club
                  </span>
                  <span>{club || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Division
                  </span>
                  <span>{divisionDisplay}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Weight Class
                  </span>
                  <span>{weightDisplay}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Grip/Stance
                  </span>
                  <span>{grip || "—"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground text-sm">
                    Match Type
                  </span>
                  <span>{s(report?.matchType) || "—"}</span>
                </div>
              </div>

              {attacks.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Athlete&apos;s Attacks:
                  </h4>
                  <ul className="list-disc list-inside ml-2 text-sm mt-1">
                    {attacks.map((a, i) => (
                      <li key={i}>{s(a)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {notesHtml && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Athlete Notes:
                  </h4>
                  <div
                    className="wysiwyg-content prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: notesHtml }}
                  />
                </div>
              )}
            </div>

            {/* VIDEOS */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
                Videos
              </h3>

              {videos.length > 0 ? (
                <div className="space-y-6">
                  {videos.map((video, i) => {
                    const title = s(video?.title);
                    const notesHtml = s(decryptedVideoNotes[i] || "");
                    const url = s(video?.url || video?.urlCanonical);
                    const start = parseInt(video?.startSeconds || 0, 10) || 0;
                    const embedUrl = toEmbedUrl(url, start);

                    return (
                      <div
                        key={i}
                        className="space-y-2"
                      >
                        {title && (
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                            {title}
                          </h4>
                        )}
                        {notesHtml && (
                          <div
                            className="wysiwyg-content prose dark:prose-invert text-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: notesHtml }}
                          />
                        )}
                        {embedUrl && (
                          <div className="aspect-video w-full rounded-lg shadow overflow-hidden">
                            <iframe
                              className="w-full h-full"
                              src={embedUrl}
                              title={title || `Video ${i + 1}`}
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="italic text-gray-500 dark:text-gray-400">
                  No videos provided.
                </p>
              )}
            </div>
          </div>

          <style
            jsx
            global
          >{`
            .wysiwyg-content ul {
              list-style: disc;
              padding-left: 1.25rem;
              margin: 0 0 12px;
            }
            .wysiwyg-content ul ul {
              list-style: circle;
              margin: 4px 0 8px;
            }
            .wysiwyg-content li {
              margin: 4px 0;
              line-height: 1.5;
            }
            .wysiwyg-content p {
              margin: 0 0 12px;
              line-height: 1.6;
            }
            .wysiwyg-content a {
              text-decoration: underline;
            }
          `}</style>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewReportModal;
