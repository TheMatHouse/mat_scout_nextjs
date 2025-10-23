// components/profile/StyleCard.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { styleSlugMap } from "@/lib/styleSlugMap";

/* helpers */
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const isNoPromotionStyle = (name) => norm(name) === "wrestling";
const toDateOrNull = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

function normalizePromotions(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((p) => {
      const rank = String(p?.rank ?? p?.title ?? p?.label ?? "").trim();
      const when =
        p?.promotedOn ?? p?.datePromoted ?? p?.date ?? p?.at ?? p?.on ?? null;
      const dt = toDateOrNull(when);
      return rank && dt ? { rank, promotedOn: dt } : null;
    })
    .filter(Boolean);
}

function mostRecentPromotion(promos) {
  if (!Array.isArray(promos) || promos.length === 0) return null;
  return [...promos].sort((a, b) => b.promotedOn - a.promotedOn)[0];
}

const StyleCard = ({ style, matches = [], username, isFamily }) => {
  console.log("MATCHES ", matches);
  const [showHistory, setShowHistory] = useState(false);

  const styleName =
    style?.styleName || style?.name || style?.style?.name || "Unknown";
  const weightClass = style?.weightClass;
  const division = style?.division;
  const grip = style?.grip;
  const favoriteTechnique = style?.favoriteTechnique;

  // Count W/L from provided matches
  const { wins, losses, total } = useMemo(() => {
    let w = 0;
    let l = 0;
    for (const m of matches) {
      const r = norm(m?.result);
      if (r === "won" || r === "win" || r === "w") w++;
      else if (r === "lost" || r === "loss" || r === "l") l++;
    }
    return { wins: w, losses: l, total: w + l };
  }, [matches]);

  const styleSlug = styleSlugMap?.[styleName] || encodeURIComponent(styleName);
  const matchLink =
    isFamily && username
      ? `/family/${username}/match-reports?style=${styleSlug}`
      : `/${username}/match-reports?style=${styleSlug}`;

  const promotions = useMemo(
    () => normalizePromotions(style?.promotions),
    [style?.promotions]
  );
  const mostRecent = useMemo(
    () => mostRecentPromotion(promotions),
    [promotions]
  );

  const explicitRank = String(style?.currentRank ?? style?.rank ?? "").trim();
  const currentRank =
    !isNoPromotionStyle(styleName) && explicitRank
      ? explicitRank
      : !isNoPromotionStyle(styleName) && mostRecent?.rank
      ? mostRecent.rank
      : explicitRank || "";

  const explicitPromoDate =
    toDateOrNull(style?.lastPromotedOn) || toDateOrNull(style?.promotionDate);
  const derivedPromoDate =
    !isNoPromotionStyle(styleName) && mostRecent?.promotedOn
      ? mostRecent.promotedOn
      : null;
  const promoDate = explicitPromoDate || derivedPromoDate;

  const promotionsSorted = useMemo(
    () => [...promotions].sort((a, b) => a.promotedOn - b.promotedOn),
    [promotions]
  );

  return (
    <div
      className="rounded-2xl shadow-md overflow-hidden border relative mb-6
                 bg-white text-gray-900 border-gray-200
                 dark:bg-[#0b0f1a] dark:text-white dark:border-border"
      data-style={styleName}
      data-matches={matches.length}
    >
      {/* Gradient top border */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      {/* Title */}
      <div className="text-center px-6 pt-5">
        <h2 className="text-3xl font-bold">{styleName}</h2>
        <hr className="my-3 w-24 mx-auto border-gray-300 dark:border-white/40" />
      </div>

      {/* Main Content */}
      <div className="px-6 pb-4 flex justify-between gap-6 flex-wrap">
        {/* Left Column */}
        <div className="space-y-2">
          {!isNoPromotionStyle(styleName) && currentRank && (
            <p>
              <span className="font-semibold">Rank:</span> {currentRank}
            </p>
          )}

          {!isNoPromotionStyle(styleName) && promoDate && (
            <p>
              <span className="font-semibold">Promotion Date:</span>{" "}
              {format(promoDate, "MMMM d, yyyy")}
            </p>
          )}

          {!isNoPromotionStyle(styleName) && promotionsSorted.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="text-left"
              >
                <span className="font-semibold">Promotion History:</span>{" "}
                <span>{showHistory ? "▾" : "▸"}</span>
              </button>

              {showHistory && (
                <ul className="ml-4 mt-1 space-y-1">
                  {promotionsSorted.map((p, idx) => (
                    <li key={`${p.rank}-${idx}`}>
                      {p.rank} — {format(p.promotedOn, "MMMM d, yyyy")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {weightClass && (
            <p>
              <span className="font-semibold">Weight Class:</span> {weightClass}
            </p>
          )}
          {division && (
            <p>
              <span className="font-semibold">Division:</span> {division}
            </p>
          )}
          {grip && (
            <p>
              <span className="font-semibold">Grip:</span> {grip}
            </p>
          )}
          {favoriteTechnique && (
            <p>
              <span className="font-semibold">Favorite Technique:</span>{" "}
              {favoriteTechnique}
            </p>
          )}

          {/* Record */}
          <p>
            <span className="font-semibold">Record:</span>{" "}
            <span className="text-green-600 dark:text-green-500 font-bold mr-2">
              {wins} W
            </span>
            <span className="text-red-600 dark:text-red-500 font-bold mr-2">
              {losses} L
            </span>
            <span className="text-muted-foreground text-sm">
              ({total} {total === 1 ? "match" : "matches"})
            </span>
          </p>
        </div>

        {/* Right Column */}
        <div className="flex items-end">
          <Link
            href={matchLink}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            View Matches →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StyleCard;
