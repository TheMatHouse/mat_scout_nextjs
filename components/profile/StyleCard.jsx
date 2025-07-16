"use client";

import Link from "next/link";
import { format } from "date-fns";
import { styleSlugMap } from "@/lib/styleSlugMap";
import { useSearchParams } from "next/navigation";

const StyleCard = ({ style, styleResults = {}, username, isFamily }) => {
  const styleName = style?.styleName || "Unknown";
  const rank = style?.rank;
  const promotionDate = style?.promotionDate;
  const weightClass = style?.weightClass;
  const division = style?.division;
  const grip = style?.grip;
  const favoriteTechnique = style?.favoriteTechnique;

  const wins = styleResults?.wins || 0;
  const losses = styleResults?.losses || 0;
  const total = wins + losses;

  const styleSlug = styleSlugMap[styleName] || encodeURIComponent(styleName);

  const matchLink =
    isFamily && username
      ? `/family/${username}/match-reports?style=${styleSlug}`
      : `/${username}/match-reports?style=${styleSlug}`;

  return (
    <div className="bg-[#0b0f1a] text-white dark:text-white rounded-2xl shadow-md overflow-hidden border border-border relative mb-6">
      {/* Gradient top border */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      {/* Title */}
      <div className="text-center px-6 pt-5">
        <h2 className="text-3xl font-bold">{styleName}</h2>
        <hr className="my-3 border-white dark:border-white/40 w-24 mx-auto" />
      </div>

      {/* Main Content */}
      <div className="px-6 pb-4 flex justify-between gap-6 flex-wrap">
        {/* Left Column */}
        <div className="space-y-2">
          {rank && (
            <p>
              <span className="font-semibold">Rank:</span> {rank}
            </p>
          )}
          {promotionDate && (
            <p>
              <span className="font-semibold">Promotion Date:</span>{" "}
              {format(new Date(promotionDate), "MMMM yyyy")}
            </p>
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
          <p>
            <span className="font-semibold">Record:</span>{" "}
            <span className="text-green-500 font-bold mr-2">{wins} W</span>
            <span className="text-red-500 font-bold mr-2">{losses} L</span>
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
