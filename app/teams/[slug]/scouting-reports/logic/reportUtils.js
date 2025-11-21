// app/teams/[slug]/scouting-reports/logic/reportUtils.js
"use client";

/**
 * Pure helper functions for:
 * - Division display
 * - Weight-class display
 * - Safe coercion
 * - Preview payload building
 */

export const toSafeStr = (v) => (v == null ? "" : String(v));

export const toNonNegInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function genderLabel(g) {
  const s = String(g ?? "").toLowerCase();
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "coed" || s === "open") return "Coed";
  return s || "";
}

export function computeDivisionDisplay(division) {
  if (!division) return "—";
  if (typeof division === "string") return division;

  if (typeof division === "object") {
    const name = division?.name || division?.label || "";
    const g = genderLabel(division?.gender);
    return name ? (g ? `${name} — ${g}` : name) : "—";
  }

  return "—";
}

export function ensureWeightDisplay(label, unit) {
  if (!label) return "";
  const low = String(label).toLowerCase();
  if (low.includes("kg") || low.includes("lb")) return label;
  return unit ? `${label} ${unit}` : label;
}

export function getDivisionId(div) {
  if (!div) return "";
  if (typeof div === "string") return div;
  if (typeof div === "object") {
    if (div._id) return String(div._id);
    if (div.id) return String(div.id);
  }
  return "";
}

/**
 * Build the preview payload exactly as the modal expects.
 */
export function buildPreviewPayload(r) {
  const divisionDisplay = computeDivisionDisplay(r?.division);

  const weightLabel = toSafeStr(r?.weightLabel).trim();
  const weightUnit = toSafeStr(r?.weightUnit).trim();
  const rawCategoryLabel =
    (typeof r?.weightCategory === "object"
      ? toSafeStr(r?.weightCategory?.label || r?.weightCategory?.name)
      : toSafeStr(r?.weightCategory)) || "";

  let weightDisplay = weightLabel || rawCategoryLabel || "";
  if (weightDisplay && weightUnit && !/\b(kg|lb)s?\b/i.test(weightDisplay)) {
    weightDisplay = `${weightDisplay} ${weightUnit}`;
  }

  // videos
  const videos = Array.isArray(r?.videos)
    ? r.videos
        .map((v) =>
          v && typeof v === "object"
            ? {
                title: toSafeStr(v.title || v.videoTitle),
                notes: toSafeStr(v.notes || v.videoNotes),
                url: toSafeStr(v.url || v.videoURL || v.urlCanonical),
                startSeconds: toNonNegInt(v.startSeconds),
              }
            : null
        )
        .filter(Boolean)
    : [];

  return {
    _id: toSafeStr(r?._id),

    matchType: toSafeStr(r?.matchType),
    eventName: toSafeStr(r?.eventName),
    matchDate: r?.matchDate || null,
    createdByName: toSafeStr(r?.createdByName),
    result: toSafeStr(r?.result),
    score: toSafeStr(r?.score),
    isPublic: !!r?.isPublic,

    athleteFirstName: toSafeStr(r?.athleteFirstName),
    athleteLastName: toSafeStr(r?.athleteLastName),
    athleteCountry: toSafeStr(r?.athleteCountry),
    athleteNationalRank: toSafeStr(r?.athleteNationalRank),
    athleteWorldRank: toSafeStr(r?.athleteWorldRank),
    athleteClub: toSafeStr(r?.athleteClub),
    athleteGrip: toSafeStr(r?.athleteGrip),

    divisionDisplay,
    division: divisionDisplay,

    weightDisplay: weightDisplay || "—",
    weightLabel,
    weightUnit,

    opponentAttacks: Array.isArray(r?.opponentAttacks)
      ? r.opponentAttacks.map(toSafeStr)
      : [],
    athleteAttacks: Array.isArray(r?.athleteAttacks)
      ? r.athleteAttacks.map(toSafeStr)
      : [],
    opponentAttackNotes: toSafeStr(r?.opponentAttackNotes),
    athleteAttackNotes: toSafeStr(r?.athleteAttackNotes),

    opponentName: toSafeStr(r?.opponentName),
    opponentCountry: toSafeStr(r?.opponentCountry),
    opponentClub: toSafeStr(r?.opponentClub),
    opponentRank: toSafeStr(r?.opponentRank),
    opponentGrip: toSafeStr(r?.opponentGrip),
    myRank: toSafeStr(r?.myRank),

    videos,
    videoURL: toSafeStr(r?.videoURL),
    videoTitle: toSafeStr(r?.videoTitle),
    videoNotes: toSafeStr(r?.videoNotes),
  };
}
