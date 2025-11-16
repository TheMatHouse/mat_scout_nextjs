// components/shared/PreviewReportModal.jsx
"use client";

import React, { useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const isLikelyObjectId = (value) => {
  const txt = s(value);
  return /^[0-9a-fA-F]{24}$/.test(txt);
};

const computeDivisionDisplay = (division, report) => {
  // 1) Prefer explicit display/label fields on the report itself
  const reportDisplay = s(report?.divisionDisplay) || s(report?.divisionLabel);
  if (reportDisplay) return reportDisplay;

  // 2) Handle various shapes of "division"
  if (!division) return "—";

  if (typeof division === "string") {
    const txt = s(division);
    // If it looks like a Mongo ObjectId, don't show the raw ID
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

// If a full <iframe ... src="..."> is pasted, extract the src; else return raw
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

// Build an embeddable URL and apply ?start= for YouTube if provided
const toEmbedUrl = (rawUrl, startSeconds = 0) => {
  const url = extractUrlFromMaybeIframe(rawUrl);
  if (!url) return "";

  // YouTube patterns
  const ytIdMatch =
    url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/i) ||
    url.match(/youtube\.com\/shorts\/([^?]+)/i);
  if (ytIdMatch && ytIdMatch[1]) {
    const base = `https://www.youtube.com/embed/${ytIdMatch[1]}`;
    const start = Math.max(0, parseInt(startSeconds || 0, 10)) || 0;
    return start ? `${base}?start=${start}` : base;
  }

  // Vimeo embeds are usually already in player form
  if (/player\.vimeo\.com\/video\//i.test(url)) return url;

  // Fallback: return whatever we got
  return url;
};

// Field pickers by reportType
const getFields = (report, reportType) => {
  // Prefer any decrypted/HTML notes fields if the API provides them
  const resolvedNotesHtml =
    s(report?.decryptedAthleteAttackNotesHtml) ||
    s(report?.decryptedAthleteAttackNotes) ||
    s(report?.athleteAttackNotesHtml) ||
    s(report?.athleteAttackNotes);

  if (reportType === "match") {
    return {
      firstName: s(report?.athleteFirstName),
      lastName: s(report?.athleteLastName),
      country: s(report?.athleteCountry),
      nationalRank: s(report?.athleteNationalRank),
      worldRank: s(report?.athleteWorldRank),
      club: s(report?.athleteClub),
      grip: s(report?.athleteGrip),
      attacks: Array.isArray(report?.athleteAttacks)
        ? report.athleteAttacks
        : [],
      notesHtml: resolvedNotesHtml,
    };
  }

  // default: scouting report
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
const PreviewReportModal = ({ report, reportType = "scouting" }) => {
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

  return (
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
        {/* -------- Athlete Info -------- */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
            Athlete Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                First Name
              </span>
              <span>{firstName || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Last Name
              </span>
              <span>{lastName || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Country
              </span>
              <span>{country || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                National Rank
              </span>
              <span>{nationalRank || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                World Rank
              </span>
              <span>{worldRank || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Club
              </span>
              <span>{club || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Division
              </span>
              <span>{divisionDisplay}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Weight Class
              </span>
              <span>{weightDisplay}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Grip/Stance
              </span>
              <span>{grip || "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
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
              {/* Render WYSIWYG HTML with list support */}
              <div
                className="wysiwyg-content prose dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: notesHtml }}
              />
            </div>
          )}
        </div>

        {/* -------- Videos -------- */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-300 dark:border-gray-700 pb-2">
            Videos
          </h3>

          {videos.length > 0 ? (
            <div className="space-y-6">
              {videos.map((video, i) => {
                const title = s(video?.title);
                const notes = s(video?.notes);
                const url = s(video?.url);
                const start = Number.isFinite(parseInt(video?.startSeconds, 10))
                  ? parseInt(video.startSeconds, 10)
                  : 0;
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
                    {notes && (
                      <div
                        className="wysiwyg-content prose dark:prose-invert text-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: notes }}
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

      {/* Global minimal styles to ensure bullets & spacing show even without Typography plugin */}
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
  );
};

export default PreviewReportModal;
