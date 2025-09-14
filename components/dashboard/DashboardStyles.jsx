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

// ---- helpers to normalize API shapes/IDs and filter strictly to the owner ----
function extractStylesShape(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.styles)) return payload.styles;
  if (payload && Array.isArray(payload.userStyles)) return payload.userStyles;
  if (payload && typeof payload === "object") {
    const arr = Object.values(payload).find(Array.isArray);
    if (Array.isArray(arr)) return arr;
  }
  return [];
}
const toIdString = (v) =>
  v && typeof v === "object" && v._id ? String(v._id) : v ? String(v) : "";
function onlyPrimaryUserStyles(arr, userId) {
  const uid = String(userId);
  return (Array.isArray(arr) ? arr : []).filter((s) => {
    const sUid = toIdString(s?.userId);
    const fam = s?.familyMemberId;
    const isMine = sUid && sUid === uid;
    const noFamily =
      fam == null ||
      String(fam) === "" ||
      (typeof fam === "object" && !fam._id);
    return isMine && noFamily;
  });
}

const DashboardStyles = () => {
  const { user } = useUser();
  const [myStyles, setMyStyles] = useState([]);
  const [matchReports, setMatchReports] = useState([]);

  // Add Style modal
  const [open, setOpen] = useState(false);

  // Promotions modal + selection
  const [promoOpen, setPromoOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState(""); // no default selection

  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // ---- loaders ----
  const loadStyles = async (userId) => {
    setLoadingStyles(true);
    try {
      const res = await fetch(`/api/dashboard/${userId}/userStyles`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch user styles");
      const data = await res.json();
      let styles = onlyPrimaryUserStyles(extractStylesShape(data), userId);

      // Optional fallback to unified route; still enforce the same filter
      if (!styles.length) {
        const res2 = await fetch(`/api/userStyles`, { cache: "no-store" });
        if (res2.ok) {
          const data2 = await res2.json();
          styles = onlyPrimaryUserStyles(extractStylesShape(data2), userId);
        }
      }

      setMyStyles(styles);
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
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      setMatchReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading match reports:", err);
      toast.error("Could not load match reports.");
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
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setMyStyles((prev) => prev.filter((s) => s._id !== deletedStyleId));
  };

  const handlePromoClose = async () => {
    await handleStylesRefresh(); // pulls fresh styles so StyleCard shows the new promotion
    setPromoOpen(false); // then close the modal
  };
  // Styles that support promotions (exclude Wrestling)
  const promotableStyles = useMemo(
    () => myStyles.filter((s) => norm(s?.styleName) !== "wrestling"),
    [myStyles]
  );

  // Resolve selected style doc (from current list)
  const selectedStyle = useMemo(
    () =>
      promotableStyles.find((s) => String(s._id) === String(selectedStyleId)) ||
      null,
    [promotableStyles, selectedStyleId]
  );

  const openPromotionModal = () => {
    setPromoOpen(true);
    setSelectedStyleId(""); // force user to choose, do not auto-select
  };

  const onPromotionUpdated = async (updatedStyle) => {
    // Replace just the updated style (or refetch if shape differs)
    if (updatedStyle?._id) {
      setMyStyles((prev) =>
        prev.map((s) =>
          String(s._id) === String(updatedStyle._id) ? updatedStyle : s
        )
      );
    } else {
      await handleStylesRefresh();
    }
    // Keep the modal open so they can add more if they want
    // If you prefer to close it after save, uncomment:
    // setPromoOpen(false);
    // toast.success("Promotion saved");
  };

  // Compute totals from matchReports
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
      {/* Header - left-aligned buttons */}
      <div className="flex flex-col items-start gap-3 mb-4">
        <h1 className="text-2xl font-bold">My Styles/Sports</h1>
        <div className="flex items-center gap-2">
          {/* Add Style (first) */}
          <Button
            className="btn btn-primary"
            onClick={() => setOpen(true)}
          >
            Add Style
          </Button>
          {/* Add Promotion (second) */}
          {promotableStyles.length > 0 && (
            <Button
              onClick={openPromotionModal}
              className="btn btn-secondary"
            >
              Add Promotion
            </Button>
          )}
        </div>
      </div>

      {/* Helper message */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-black/20 p-4">
        <p className="text-sm">
          Use <span className="font-medium">Add Style</span> to create a
          style/sport you can record match results for. Use{" "}
          <span className="font-medium">Add Promotion</span> to add or edit
          promotion history for Judo/BJJ. The most recent promotion becomes your{" "}
          <span className="font-medium">current rank</span>.
        </p>
      </div>

      {/* Add Style Modal */}
      <ModalLayout
        isOpen={open}
        onClose={() => setOpen(false)}
        description="Add a new style/sport here. You can edit this style at any time."
        withCard={true}
      >
        <StyleForm
          user={user}
          userType="user"
          title="Add Promotion"
          setOpen={setOpen}
          onSuccess={handleStylesRefresh}
        />
      </ModalLayout>

      {/* Promotions Modal (header-level; includes style dropdown, lazy loads content) */}
      <ModalLayout
        isOpen={promoOpen}
        onClose={() => setPromoOpen(false)}
        title="Add Promotion"
        description="Choose a style and update its promotion history."
        withCard={true}
      >
        {promotableStyles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            You don’t have any styles that use promotions yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Style chooser */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Style</label>
              <select
                className="border rounded-md px-3 py-2 bg-background"
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
              >
                <option value="">Select a style…</option>
                {promotableStyles.map((s) => (
                  <option
                    key={s._id}
                    value={String(s._id)}
                  >
                    {s.styleName}
                  </option>
                ))}
              </select>
            </div>

            {/* Lazy-load the promotions UI only after a style is selected */}
            {selectedStyleId ? (
              <PromotionsForm
                userStyleId={selectedStyleId}
                onUpdated={onPromotionUpdated}
                onClose={async () => {
                  await handleStylesRefresh();
                  setPromoOpen(false);
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a style to manage promotions.
              </div>
            )}
          </div>
        )}
      </ModalLayout>

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {/* Loading / Empty / Cards */}
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
              key={style._id}
              style={style}
              user={user}
              userType="user"
              styleResultsMap={styleResultsMap}
              onDelete={handleDeleteStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardStyles;
