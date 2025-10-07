"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import ModalLayout from "../shared/ModalLayout";

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const isNoPromotionStyle = (name) => norm(name) === "wrestling";

/** Looser outcome parsing: handles "Won by Ippon", "W", "Victory", etc. */
function parseOutcome(r) {
  const text = (r.result ?? r.outcome ?? r.decision ?? r.status ?? "")
    .toString()
    .toLowerCase();

  if (r.isWin === true) return "win";
  if (r.isLoss === true) return "loss";

  if (!text) return "unknown";
  if (text.includes("draw") || text.includes("tie")) return "draw";

  if (
    text.startsWith("w") ||
    text.includes("win") ||
    text.includes("won") ||
    text.includes("victory") ||
    text.includes("ipp") ||
    text.includes("submission") ||
    text.includes("sub")
  ) {
    return "win";
  }

  if (
    text.startsWith("l") ||
    text.includes("loss") ||
    text.includes("lost") ||
    text.includes("defeat")
  ) {
    return "loss";
  }

  return "unknown";
}

/** Try to extract a family member id from a report in many shapes. */
function getReportFamilyId(r) {
  if (r.familyMemberId) return String(r.familyMemberId);
  if (r.family) return String(r.family);
  if (r.athleteType === "family" && r.athleteId) return String(r.athleteId);
  if (r.athlete?.type === "family" && r.athlete?.id)
    return String(r.athlete.id);
  return null;
}

/** Does a report belong to this style? (by userStyleId OR name-like) */
function matchesStyle(r, idKey, lowerNameKey) {
  const rUserStyleId = r.userStyleId ? String(r.userStyleId) : null;
  if (idKey && rUserStyleId && rUserStyleId === idKey) return true;

  const rName =
    r.styleName ||
    r.style ||
    r.style_type ||
    r.styleLabel ||
    r?.style?.name ||
    "";
  if (lowerNameKey && norm(rName) === lowerNameKey) return true;

  return false;
}

/** Resolve totals with multiple key paths + legacy compute. */
function resolveTotals({ style, member, styleResultsMap, styleResults }) {
  const empty = {
    wins: 0,
    losses: 0,
    draws: 0,
    _debugKey: "none",
    _matchedReports: [],
    _availableMapKeys: Object.keys(styleResultsMap || {}),
  };
  if (!style) return empty;

  const idKey = style?._id ? String(style._id) : null;
  const nameKey = style?.styleName || null;
  const lowerNameKey = norm(style?.styleName || "");
  const famId = member?._id ? String(member._id) : null;

  if (
    idKey &&
    styleResultsMap &&
    Object.prototype.hasOwnProperty.call(styleResultsMap, idKey)
  ) {
    return {
      ...(styleResultsMap[idKey] || empty),
      _debugKey: `_id:${idKey}`,
      _matchedReports: [],
    };
  }

  if (
    nameKey &&
    styleResultsMap &&
    Object.prototype.hasOwnProperty.call(styleResultsMap, nameKey)
  ) {
    return {
      ...(styleResultsMap[nameKey] || empty),
      _debugKey: `name:${nameKey}`,
      _matchedReports: [],
    };
  }

  if (lowerNameKey && styleResultsMap) {
    const foundKey = Object.keys(styleResultsMap).find(
      (k) => norm(k) === lowerNameKey
    );
    if (foundKey) {
      return {
        ...(styleResultsMap[foundKey] || empty),
        _debugKey: `iname:${foundKey}`,
        _matchedReports: [],
      };
    }
  }

  const matched = [];
  let wins = 0,
    losses = 0,
    draws = 0;

  if (Array.isArray(styleResults) && styleResults.length > 0) {
    for (const r of styleResults) {
      if (!matchesStyle(r, idKey, lowerNameKey)) continue;

      if (famId) {
        const rFam = getReportFamilyId(r);
        if (!rFam || rFam !== famId) continue;
      }

      const outcome = parseOutcome(r);
      if (outcome === "win") wins += 1;
      else if (outcome === "loss") losses += 1;
      else if (outcome === "draw") draws += 1;

      matched.push({
        _id: r._id,
        userStyleId: r.userStyleId,
        style: r.style || r.styleName,
        result: r.result || r.outcome,
        parsed: outcome,
        familyMemberId: getReportFamilyId(r),
      });
    }
  }

  return {
    wins,
    losses,
    draws,
    _debugKey: "computed:legacyArray",
    _matchedReports: matched,
    _availableMapKeys: Object.keys(styleResultsMap || {}),
  };
}

/* ---------- promotions helpers ---------- */
function toDateOrNull(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function normalizePromotions(arr) {
  // Accept objects with { rank, promotedOn } or legacy keys like { rank, date } etc.
  return (Array.isArray(arr) ? arr : [])
    .map((p) => {
      const rank = String(p?.rank ?? p?.title ?? p?.label ?? "").trim();
      const when =
        p?.promotedOn ?? p?.datePromoted ?? p?.date ?? p?.at ?? p?.on ?? null;
      const dt = toDateOrNull(when);
      return rank && dt ? { rank, promotedOn: dt.toISOString() } : null;
    })
    .filter(Boolean);
}

function mostRecentPromotion(promos) {
  if (!Array.isArray(promos) || promos.length === 0) return null;
  // choose max by date
  return [...promos].sort(
    (a, b) => new Date(b.promotedOn) - new Date(a.promotedOn)
  )[0];
}

const StyleCard = ({
  style: initialStyle,
  styleResultsMap,
  styleResults,
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

  // 🔄 keep local state in sync if parent updates the style (e.g., after promotions change)
  useEffect(() => {
    setStyle(initialStyle);
  }, [initialStyle]);

  const resolved = useMemo(
    () =>
      resolveTotals({
        style,
        member,
        styleResultsMap: styleResultsMap || {},
        styleResults: styleResults || [],
      }),
    [style, member, styleResultsMap, styleResults]
  );

  const { wins, losses, draws, _debugKey } = resolved;

  // Promotions (derive current from most recent if not explicitly set)
  const noPromotions = isNoPromotionStyle(style?.styleName);
  const promotions = useMemo(
    () => normalizePromotions(style?.promotions),
    [style?.promotions]
  );
  const mostRecent = useMemo(
    () => mostRecentPromotion(promotions),
    [promotions]
  );

  const currentRankExplicit = String(
    style?.currentRank ?? style?.rank ?? ""
  ).trim();
  const currentRank =
    !noPromotions && currentRankExplicit
      ? currentRankExplicit
      : !noPromotions && mostRecent?.rank
      ? mostRecent.rank
      : currentRankExplicit || "—";

  // Sorted history (oldest → newest)
  const promotionsSorted = useMemo(
    () =>
      [...promotions].sort(
        (a, b) => new Date(a.promotedOn) - new Date(b.promotedOn)
      ),
    [promotions]
  );

  const grip =
    style?.grip && String(style.grip).trim() !== "" ? style.grip : "—";
  const favoriteTechnique =
    style?.favoriteTechnique && String(style.favoriteTechnique).trim() !== ""
      ? style.favoriteTechnique
      : "—";

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

  // PDF links
  const styleParam = style?.styleName || style?._id || "Judo";
  const resolvedLogo = logoUrl || process.env.NEXT_PUBLIC_PDF_LOGO || "";
  const qs = new URLSearchParams();
  if (resolvedLogo) qs.set("logo", resolvedLogo);
  if (style?._id) qs.set("userStyleId", String(style._id));
  const familyId = style?.familyMemberId || member?._id || null;
  if (familyId) qs.set("familyMemberId", String(familyId));

  const pdfHref = `/api/records/style/${encodeURIComponent(styleParam)}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  const qsPromos = new URLSearchParams(qs.toString());
  qsPromos.set("view", "promotions");
  const pdfPromotionsHref = `/api/records/style/${encodeURIComponent(
    styleParam
  )}${qsPromos.toString() ? `?${qsPromos.toString()}` : ""}`;

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
              <ModalLayout
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Edit Style"
                description={`Update details for ${
                  style?.styleName || "this style"
                }.`}
                withCard={true}
              >
                <StyleForm
                  user={user}
                  style={style}
                  userType={userType}
                  setOpen={setOpen}
                  onSuccess={(updated) => setStyle(updated)}
                  member={member}
                />
              </ModalLayout>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3 text-sm sm:text-base leading-relaxed">
        {!isNoPromotionStyle(style?.styleName) && (
          <>
            {style.startDate && (
              <div>
                <span className="font-semibold text-slate-300">
                  Started {style.styleName}:
                </span>{" "}
                {moment.utc(style.startDate).format("MMMM YYYY")}
              </div>
            )}

            <div>
              <span className="font-semibold text-slate-300">Rank:</span>{" "}
              {currentRank || "—"}
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
                        {p.rank} —{" "}
                        {moment.utc(p.promotedOn).format("MMMM D, YYYY")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {/* Removed Division & Weight Class per your spec */}
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
              <strong>Wins:</strong> {Number(wins || 0)}
            </div>
            <div>
              <strong>Losses:</strong> {Number(losses || 0)}
            </div>
            {!!draws && (
              <div>
                <strong>Draws:</strong> {Number(draws || 0)}
              </div>
            )}
            <div className="text-xs text-slate-400 mt-1">
              <em>calc: {_debugKey}</em>
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
          {!isNoPromotionStyle(style?.styleName) && (
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
