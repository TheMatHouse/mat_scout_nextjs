import Link from "next/link";
//import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function StyleCard({ style, styleResults = {}, username }) {
  const {
    styleName,
    division,
    weightClass,
    rank,
    promotionDate,
    grip,
    favoriteTechnique,
  } = style;

  const wins = styleResults.Wins || 0;
  const losses = styleResults.Losses || 0;
  const total = wins + losses;

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
            href={`/matches/${styleName.toLowerCase()}`}
            className="text-primary hover:underline text-right"
          >
            View Matches →
          </Link>
        </div>
      </div>
    </div>
  );
}
