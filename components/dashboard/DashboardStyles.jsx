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

const DashboardStyles = () => {
  const { user } = useUser();
  const [myStyles, setMyStyles] = useState([]);
  const [matchReports, setMatchReports] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    fetchStyles();
    fetchMatches();
  }, [user]);

  const fetchStyles = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`);
      if (!res.ok) throw new Error("Failed to fetch user styles");
      const data = await res.json();
      setMyStyles(data);
    } catch (err) {
      console.error("Error loading user styles:", err);
      toast.error("Could not load styles.");
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/matchReports`);
      if (!res.ok) throw new Error("Failed to fetch match reports");
      const data = await res.json();
      setMatchReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading match reports:", err);
      toast.error("Could not load match reports.");
    }
  };

  const handleStylesRefresh = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`);
      if (!res.ok) throw new Error("Failed to fetch updated styles.");
      const updatedStyles = await res.json();
      setMyStyles(updatedStyles);
    } catch (err) {
      toast.error("Failed to refresh styles");
    }
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setMyStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
  };

  // ✅ Compute totals from the same source as Matches page
  const styleResultsMap = useMemo(() => {
    const map = {}; // key: normalized style -> { wins, losses, draws }
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
    // Ensure every card style exists (0s if no matches yet)
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

      {/* Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {myStyles.map((style) => (
          <StyleCard
            key={style._id}
            style={style}
            user={user}
            userType="user"
            styleResultsMap={styleResultsMap} // ← pass map (source of truth)
            onDelete={handleDeleteStyle}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardStyles;
