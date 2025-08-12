"use client";

import React, { useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { GrEdit } from "react-icons/gr";
import { useUser } from "@/context/UserContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import StyleForm from "./forms/StyleForm";

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

function getTotals({ styleResultsMap, styleResultsArray, styleName }) {
  const key = norm(styleName);

  // 1) Preferred: map keyed by normalized style
  if (styleResultsMap && typeof styleResultsMap === "object") {
    const row =
      styleResultsMap[key] ||
      styleResultsMap[styleName] ||
      styleResultsMap[
        Object.keys(styleResultsMap).find((k) => norm(k) === key) || ""
      ];
    if (row) {
      return {
        wins: Number(row.wins ?? row?.totals?.wins ?? row?.Wins ?? 0) || 0,
        losses:
          Number(row.losses ?? row?.totals?.losses ?? row?.Losses ?? 0) || 0,
      };
    }
  }

  // 2) Fallback: array of rows with various shapes
  const arr = Array.isArray(styleResultsArray) ? styleResultsArray : [];
  const hit =
    arr.find((r) => norm(r?.styleName ?? r?.Style ?? r?.style) === key) || null;

  if (hit) {
    const t = hit.totals || hit;
    return {
      wins: Number(t?.wins ?? t?.Wins ?? 0) || 0,
      losses: Number(t?.losses ?? t?.Losses ?? 0) || 0,
    };
  }

  return { wins: 0, losses: 0 };
}

const StyleCard = ({
  style: initialStyle,
  styleResultsMap, // ← new preferred prop
  styleResults, // optional legacy array prop
  user,
  userType,
  onDelete,
  member,
  logoUrl,
}) => {
  const router = useRouter();
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const { refreshUser } = useUser();

  const handleDeleteStyle = async () => {
    if (!window.confirm(`Delete ${style.styleName}?`)) return;
    try {
      const userId = member?.userId || user?._id;
      const endpoint =
        userType === "family"
          ? `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}/family/${member._id}/styles/${style._id}`
          : `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}/userStyles/${style._id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        refreshUser();
        onDelete?.(style._id);
      } else {
        toast.error(data.message || "Failed to delete style.");
      }
    } catch {
      toast.error("Server error while deleting style.");
    }
  };

  const { wins, losses } = getTotals({
    styleResultsMap,
    styleResultsArray: styleResults,
    styleName: style.styleName,
  });

  // PDF link
  const styleParam = style?.styleName || style?._id || "Judo";
  const resolvedLogo = logoUrl || process.env.NEXT_PUBLIC_PDF_LOGO || "";
  const qs = new URLSearchParams();
  if (resolvedLogo) qs.set("logo", resolvedLogo);
  const pdfHref = `/api/records/style/${encodeURIComponent(styleParam)}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 dark:bg-slate-900/80 text-white shadow-xl backdrop-blur-md ring-1 ring-slate-700 hover:ring-2 hover:ring-[#ef233c] transition-all duration-200 transform hover:scale-[1.02]">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-5 py-3 text-xl font-bold tracking-wide rounded-t-2xl flex justify-between items-center">
        <span>{style.styleName}</span>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <GrEdit
              className="cursor-pointer hover:scale-110 transition"
              size={20}
            />
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Edit Style</DialogTitle>
              <DialogDescription>
                Update details for {style.styleName}.
              </DialogDescription>
            </DialogHeader>
            <StyleForm
              user={user}
              style={style}
              userType={userType}
              setOpen={setOpen}
              onSuccess={(updated) => setStyle(updated)}
              member={member}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3 text-sm sm:text-base leading-relaxed">
        <div>
          <span className="font-semibold text-slate-300">Rank:</span>{" "}
          {style.rank}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Promotion Date:</span>{" "}
          {style.promotionDate
            ? moment.utc(style.promotionDate).format("MMMM D, YYYY")
            : "—"}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Division:</span>{" "}
          {style.division}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Weight Class:</span>{" "}
          {style.weightClass}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Grip:</span>{" "}
          {style.grip}
        </div>
        <div>
          <span className="font-semibold text-slate-300">
            Favorite Technique:
          </span>{" "}
          {style.favoriteTechnique}
        </div>

        <div>
          <span className="font-semibold text-slate-300">
            My Record in {style.styleName}:
          </span>
          <div className="ml-4 space-y-1">
            <div>
              <strong>Wins:</strong> {wins}
            </div>
            <div>
              <strong>Losses:</strong> {losses}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-4 gap-3">
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener"
          className="btn-white-sm"
        >
          Print PDF Record
        </a>
        <button
          onClick={handleDeleteStyle}
          className="px-3 py-1.5 rounded-lg border border-red-400 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-xs font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default StyleCard;
