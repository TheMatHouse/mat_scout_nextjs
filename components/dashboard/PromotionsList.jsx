"use client";

import { format } from "date-fns";

export default function PromotionsList({ promotions = [] }) {
  if (!promotions.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No promotions recorded yet.
      </div>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {[...promotions].reverse().map((p, i) => (
        <li
          key={i}
          className="flex items-center justify-between"
        >
          <span className="font-medium">{p.rank}</span>
          <span className="text-muted-foreground">
            {p.promotedOn ? format(new Date(p.promotedOn), "LLL d, yyyy") : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
