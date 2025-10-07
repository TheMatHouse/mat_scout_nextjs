// components/dashboard/DashboardStyles.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import StyleCard from "./StyleCard";
import StyleForm from "./forms/StyleForm";
import PromotionsForm from "./forms/PromotionsForm";

/* --------------------- small utils --------------------- */
const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const normalizeResult = (val) => {
  const v = norm(val);
  if (["won", "win", "w"].includes(v)) return "win";
  if (["lost", "loss", "l"].includes(v)) return "loss";
  if (["draw", "tie", "d"].includes(v)) return "draw";
  return "";
};

function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-700 bg-slate-800/80 dark:bg-slate-900/80 shadow-xl animate-pulse h-56"
        />
      ))}
    </div>
  );
}

/* -------------- shape + ownership normalization -------------- */
const looksLikeStyle = (x) =>
  x &&
  typeof x === "object" &&
  (typeof x.styleName === "string" ||
    typeof x.name === "string" ||
    (x.style && typeof x.style.name === "string"));

function extractStylesShape(payload) {
  if (Array.isArray(payload) && payload.every(looksLikeStyle)) return payload;
  if (
    payload &&
    Array.isArray(payload.styles) &&
    payload.styles.every(looksLikeStyle)
  ) {
    return payload.styles;
  }
  if (
    payload &&
    Array.isArray(payload.userStyles) &&
    payload.userStyles.every(looksLikeStyle)
  ) {
    return payload.userStyles;
  }
  if (
    payload &&
    Array.isArray(payload.data) &&
    payload.data.every(looksLikeStyle)
  ) {
    return payload.data;
  }
  if (
    payload &&
    Array.isArray(payload.items) &&
    payload.items.every(looksLikeStyle)
  ) {
    return payload.items;
  }
  return [];
}

function normalizeStyleName(style) {
  if (!style) return style;
  const name =
    style.styleName || style.name || (style.style && style.style.name) || "";
  return { ...style, styleName: name };
}

function getOwnerId(style) {
  const v = style?.userId ?? style?.user ?? style?.owner ?? null;
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof v._id === "string") return v._id;
    if (v._id != null) return String(v._id);
  }
  try {
    return String(v);
  } catch {
    return "";
  }
}

function onlyPrimaryUserStyles(arr, userId) {
  const uid = String(userId);
  return (Array.isArray(arr) ? arr : []).filter((s) => {
    const owner = getOwnerId(s);
    const isMine = owner && String(owner) === uid;
    const fam = s?.familyMemberId;
    const noFamily =
      fam == null ||
      String(fam) === "" ||
      (typeof fam === "object" && !fam._id);
    return isMine && noFamily;
  });
}

/* --------------------- component --------------------- */

function DashboardStyles() {
  const { user } = useUser();

  const [myStyles, setMyStyles] = useState([]);
  const [matchReports, setMatchReports] = useState([]);

  const [open, setOpen] = useState(false);

  const [promoOpen, setPromoOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState("");

  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // version flag to force card re-render after updates
  const [stylesVersion, setStylesVersion] = useState(0);

  const loadStyles = async (userId) => {
    setLoadingStyles(true);
    try {
      const candidates = [
        `/api/dashboard/${userId}/userStyles`,
        `/api/userStyles?userId=${encodeURIComponent(userId)}`,
        `/api/styles?userId=${encodeURIComponent(userId)}`,
      ];

      let styles = [];
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(`[styles] ${res.status} ${url}`, body);
            continue;
          }
          const payload = await res.json().catch(() => null);
          const extracted = extractStylesShape(payload).map(normalizeStyleName);
          const mine = onlyPrimaryUserStyles(extracted, userId);
          if (mine.length > 0) {
            styles = mine;
            break;
          }
        } catch (e) {
          console.warn("[styles] network error:", e);
        }
      }

      setMyStyles(styles);
      if (styles.length === 0) {
        console.info(
          "[styles] No owned styles found after normalization/filters."
        );
      }
    } catch (err) {
      console.error("Error loading user styles:", err);
      toast.error("Could not load styles.");
      setMyStyles([]);
    } finally {
      setLoadingStyles(false);
    }
  };

  const loadMatches = async (userId) => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/dashboard/${userId}/matchReports`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        console.warn(
          `[match-reports] 404 at /api/dashboard/${userId}/matchReports`
        );
        setMatchReports([]);
      } else if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[match-reports] ${res.status} at /api/dashboard/${userId}/matchReports`,
          body
        );
        setMatchReports([]);
      } else {
        const data = await res.json().catch(() => []);
        setMatchReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading match reports:", err);
      setMatchReports([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (!user?._id) return;
    loadStyles(user._id);
    loadMatches(user._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleStylesRefresh = async () => {
    if (!user?._id) return;
    await loadStyles(user._id);
    setStylesVersion((v) => v + 1);
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setMyStyles((prev) =>
      prev.filter((s) => String(s._id) !== String(deletedStyleId))
    );
    setStylesVersion((v) => v + 1);
  };

  const styleSupportsPromotions = (s) => norm(s?.styleName) !== "wrestling";

  const hasPromotable = useMemo(
    () => myStyles.some(styleSupportsPromotions),
    [myStyles]
  );

  const selectedStyle = useMemo(
    () =>
      myStyles.find((s) => String(s._id) === String(selectedStyleId)) || null,
    [myStyles, selectedStyleId]
  );

  const openPromotionModal = () => {
    setPromoOpen(true);
    setSelectedStyleId("");
  };

  const onPromotionUpdated = async (updatedStyle) => {
    if (updatedStyle?._id) {
      setMyStyles((prev) =>
        prev.map((s) =>
          String(s._id) === String(updatedStyle._id)
            ? normalizeStyleName(updatedStyle)
            : s
        )
      );
    }
    if (user?._id) {
      await loadStyles(user._id); // authoritative refresh
    }
    setStylesVersion((v) => v + 1); // force card re-render
  };

  const styleResultsMap = useMemo(() => {
    const map = {};
    for (const r of matchReports) {
      const key = norm(r?.matchType);
      if (!key) continue;
      map[key] ??= {
        styleName: r.matchType || "Unknown",
        wins: 0,
        losses: 0,
        draws: 0,
      };
      const out = normalizeResult(r?.result);
      if (out === "win") map[key].wins += 1;
      else if (out === "loss") map[key].losses += 1;
      else if (out === "draw") map[key].draws += 1;
    }
    for (const s of myStyles) {
      const key = norm(s?.styleName);
      map[key] ??= {
        styleName: s?.styleName || "Unknown",
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }
    return map;
  }, [matchReports, myStyles]);

  const isLoading = loadingStyles || loadingMatches;

  return (
    <div className="px-4 md:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-3 mb-4">
        <h1 className="text-2xl font-bold">My Styles/Sports</h1>
        <div className="flex items-center gap-2">
          <Button
            className="btn btn-primary"
            onClick={() => setOpen(true)}
          >
            Add Style
          </Button>
          {hasPromotable && (
            <Button
              variant="secondary"
              onClick={openPromotionModal}
            >
              Add Promotion
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-black/20 p-4">
        <p className="text-sm">
          Use <span className="font-medium">Add Style</span> to create a
          style/sport you can record match results for. Use{" "}
          <span className="font-medium">Add Promotion</span> to add or edit
          promotion history where applicable (e.g., Judo / BJJ). The most recent
          promotion becomes your{" "}
          <span className="font-medium">current rank</span>.
        </p>
      </div>

      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Style"
        description="Add a new style/sport here. You can edit this style at any time."
        withCard={true}
      >
        <StyleForm
          user={user}
          userType="user"
          setOpen={setOpen}
          onSuccess={handleStylesRefresh}
        />
      </ModalLayout>

      <ModalLayout
        isOpen={promoOpen}
        onClose={() => setPromoOpen(false)}
        title="Add Promotion"
        description="Choose a style and update its promotion history."
        withCard={true}
      >
        {myStyles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            You don’t have any styles yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Style</label>
              <select
                className="border rounded-md px-3 py-2 bg-background"
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
              >
                <option value="">Select a style…</option>
                {myStyles.map((s) => (
                  <option
                    key={s._id}
                    value={String(s._id)}
                  >
                    {s.styleName}
                  </option>
                ))}
              </select>
            </div>

            {selectedStyleId ? (
              norm(selectedStyle?.styleName) !== "wrestling" ? (
                <PromotionsForm
                  userStyleId={selectedStyleId}
                  onUpdated={onPromotionUpdated}
                  onClose={() => setPromoOpen(false)}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Promotions are not tracked for{" "}
                  <span className="font-medium">
                    {selectedStyle?.styleName}
                  </span>
                  .
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a style to manage promotions.
              </div>
            )}
          </div>
        )}
      </ModalLayout>

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {isLoading ? (
        <SkeletonGrid />
      ) : myStyles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm">
            No styles yet. Click “Add Style” to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-2">
          {myStyles.map((style) => (
            <StyleCard
              key={`${style._id}-${stylesVersion}`}
              style={style}
              user={user}
              userType="user"
              styleResultsMap={styleResultsMap}
              onDelete={(deletedId) => handleDeleteStyle(deletedId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardStyles;
