"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import StyleCard from "./StyleCard";
import StyleForm from "./forms/StyleForm";

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

const DashboardStyles = () => {
  const { user } = useUser();
  const [myStyles, setMyStyles] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [open, setOpen] = useState(false);

  // loading flags
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    if (!user?._id) return;

    setLoadingStyles(true);
    setLoadingMatches(true);

    // kick off both in parallel
    fetch(`/api/dashboard/${user._id}/userStyles`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch user styles");
        const data = await res.json();
        setMyStyles(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error loading user styles:", err);
        toast.error("Could not load styles.");
      })
      .finally(() => setLoadingStyles(false));

    fetch(`/api/dashboard/${user._id}/matchReports`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch match reports");
        const data = await res.json();
        setMatchReports(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error loading match reports:", err);
        toast.error("Could not load match reports.");
      })
      .finally(() => setLoadingMatches(false));
  }, [user]);

  const handleStylesRefresh = async () => {
    try {
      setLoadingStyles(true);
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`);
      if (!res.ok) throw new Error("Failed to fetch updated styles.");
      const updatedStyles = await res.json();
      setMyStyles(Array.isArray(updatedStyles) ? updatedStyles : []);
    } catch (err) {
      toast.error("Failed to refresh styles");
    } finally {
      setLoadingStyles(false);
    }
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setMyStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
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
      {/* Header */}
      <div className="flex flex-col items-start gap-4 mb-4">
        <h1 className="text-2xl font-bold">My Styles/Sports</h1>
        <Button
          className="btn btn-primary"
          onClick={() => setOpen(true)}
        >
          Add Style
        </Button>
      </div>

      {/* Helpful message (you already tweaked the text color; keep your change if you prefer) */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/5 dark:bg-black/20 p-4">
        <p className="text-sm">
          Click <span className="font-medium">Add Style</span> to create a
          style/sport you can record match results for. For Judo and Brazilian
          Jiu-Jitsu, edit the style later to add promotion dates and track your
          history. The most recent promotion will be set as your{" "}
          <span className="font-medium">current rank</span>.
        </p>
      </div>

      {/* Modal */}
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

      <hr className="border-gray-200 dark:border-gray-700 my-4" />

      {/* Loading skeleton */}
      {isLoading ? (
        <SkeletonGrid />
      ) : myStyles.length === 0 ? (
        // Empty state only after loading finishes
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm">
            No styles yet. Click “Add Style” to get started.
          </p>
        </div>
      ) : (
        // Style Cards
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
