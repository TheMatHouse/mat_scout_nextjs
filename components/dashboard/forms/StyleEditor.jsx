"use client";

import { useState } from "react";
import StyleForm from "./StyleForm";
import AddPromotionForm from "./AddPromotionForm";
import PromotionsList from "@/components/dashboard/PromotionsList";
import { format } from "date-fns";

export default function StyleEditor({
  user,
  style: initialStyle,
  userType = "user",
  member,
  setOpen,
  onChanged,
}) {
  const [style, setStyle] = useState(initialStyle);

  return (
    <div className="space-y-6">
      <StyleForm
        user={user}
        style={style}
        userType={userType}
        member={member}
        setOpen={setOpen}
        onSuccess={(updated) => {
          setStyle(updated);
          onChanged?.(updated);
        }}
      />

      {style?._id && (
        <div className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-xl">
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">
              Current Rank:{" "}
              <span className="font-medium text-foreground">
                {style.currentRank || "—"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Started:{" "}
              <span className="font-medium text-foreground">
                {style.startDate
                  ? format(new Date(style.startDate), "LLL yyyy")
                  : "—"}
              </span>
            </div>
          </div>

          <h4 className="text-base font-semibold mb-2">Promotion History</h4>
          <PromotionsList promotions={style.promotions || []} />

          <div className="mt-5">
            <h4 className="text-base font-semibold mb-2">Add Promotion</h4>
            <AddPromotionForm
              userStyleId={style._id}
              onAdded={(updated) => {
                setStyle(updated);
                onChanged?.(updated);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
