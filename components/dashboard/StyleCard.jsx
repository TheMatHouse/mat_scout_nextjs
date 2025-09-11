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

// Wrestling has no promotions/ranks
const isNoPromotionStyle = (name) => norm(name) === "wrestling";

const StyleCard = ({
  style: initialStyle,
  styleResultsMap, // preferred prop
  styleResults, // (legacy) not used now, but kept for compatibility
  user,
  userType,
  onDelete,
  member,
  logoUrl,
}) => {
  const router = useRouter();
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { refreshUser } = useUser();

  const handleDeleteStyle = async () => {
    if (!window.confirm(`Delete ${style.styleName}?`)) return;
    try {
      const userId = member?.userId || user?._id;
      const endpoint =
        userType === "family"
          ? `/api/dashboard/${userId}/family/${member._id}/styles/${style._id}`
          : `/api/dashboard/${userId}/userStyles/${style._id}`;

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

  // Totals come from parent (already computed from matchReports)
  const key = norm(style.styleName);
  const totalsRow = styleResultsMap?.[key] ||
    styleResultsMap?.[style.styleName] ||
    styleResultsMap?.[
      Object.keys(styleResultsMap || {}).find((k) => norm(k) === key) || ""
    ] || { wins: 0, losses: 0, draws: 0 };
  const wins = Number(totalsRow.wins || 0);
  const losses = Number(totalsRow.losses || 0);

  // PDF links
  const styleParam = style?.styleName || style?._id || "Judo";
  const resolvedLogo = logoUrl || process.env.NEXT_PUBLIC_PDF_LOGO || "";
  const qs = new URLSearchParams();
  if (resolvedLogo) qs.set("logo", resolvedLogo);

  // Always pass the exact userStyle doc id (bullet-proof for PDFs)
  if (style?._id) qs.set("userStyleId", String(style._id));

  // Robust family member propagation (from style doc or page context)
  const familyId = style?.familyMemberId || member?._id || null;
  if (familyId) qs.set("familyMemberId", String(familyId));

  const pdfHref = `/api/records/style/${encodeURIComponent(styleParam)}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  // Promotions PDF via ?view=promotions (only if the style uses promotions)
  const qsPromos = new URLSearchParams(qs.toString());
  qsPromos.set("view", "promotions");
  const pdfPromotionsHref = `/api/records/style/${encodeURIComponent(
    styleParam
  )}${qsPromos.toString() ? `?${qsPromos.toString()}` : ""}`;

  // ---- derived fields & safe fallbacks ----
  const currentRankRaw = style?.currentRank ?? style?.rank ?? "";
  const currentRank =
    currentRankRaw && String(currentRankRaw).trim() !== ""
      ? currentRankRaw
      : "—";

  const latestPromotion = style?.lastPromotedOn ?? style?.promotionDate ?? null;
  const latestPromotionText = latestPromotion
    ? moment.utc(latestPromotion).format("MMMM D, YYYY")
    : "—";

  const promotions = Array.isArray(style?.promotions) ? style.promotions : [];
  const promotionsSorted = [...promotions].sort(
    (a, b) => new Date(a.promotedOn) - new Date(b.promotedOn)
  );

  const division =
    style?.division && String(style.division).trim() !== ""
      ? style.division
      : "—";
  const weightClass =
    style?.weightClass && String(style.weightClass).trim() !== ""
      ? style.weightClass
      : "—";
  const grip =
    style?.grip && String(style.grip).trim() !== "" ? style.grip : "—";
  const favoriteTechnique =
    style?.favoriteTechnique && String(style.favoriteTechnique).trim() !== ""
      ? style.favoriteTechnique
      : "—";

  const noPromotions = isNoPromotionStyle(style?.styleName);

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

            {open && (
              <StyleForm
                user={user}
                style={style}
                userType={userType}
                setOpen={setOpen}
                onSuccess={(updated) => setStyle(updated)}
                member={member}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3 text-sm sm:text-base leading-relaxed">
        {/* Hide rank/promotion if Wrestling */}
        {!noPromotions && (
          <>
            <div>
              <span className="font-semibold text-slate-300">Rank:</span>{" "}
              {currentRank}
            </div>

            <div>
              <span className="font-semibold text-slate-300">
                Promotion Date:
              </span>{" "}
              {latestPromotionText}
            </div>

            {promotionsSorted.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="text-left"
                >
                  <span className="font-semibold text-slate-300">
                    Promotion History:
                  </span>{" "}
                  <span>{showHistory ? "▾" : "▸"}</span>
                </button>

                {showHistory && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {promotionsSorted.map((p, idx) => (
                      <li key={idx}>
                        {moment.utc(p.promotedOn).format("MMMM D, YYYY")} —{" "}
                        {p.rank}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {/* Started {styleName}: only if startDate present (always allowed) */}
        {style.startDate && (
          <div>
            <span className="font-semibold text-slate-300">
              Started {style.styleName}:
            </span>{" "}
            {moment.utc(style.startDate).format("MMMM YYYY")}
          </div>
        )}

        <div>
          <span className="font-semibold text-slate-300">Division:</span>{" "}
          {division}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Weight Class:</span>{" "}
          {weightClass}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Grip:</span> {grip}
        </div>
        <div>
          <span className="font-semibold text-slate-300">
            Favorite Technique:
          </span>{" "}
          {favoriteTechnique}
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
        <div className="flex items-center gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener"
            className="btn-white-sm"
          >
            Print PDF Record
          </a>
        </div>

        <div className="flex items-center gap-2">
          {/* Hide Promotions PDF for Wrestling */}
          {!noPromotions && (
            <a
              href={pdfPromotionsHref}
              target="_blank"
              rel="noopener"
              className="btn-white-sm"
            >
              Print Promotions
            </a>
          )}
          <button
            onClick={handleDeleteStyle}
            className="px-3 py-1.5 rounded-lg border border-red-400 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-xs font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleCard;
