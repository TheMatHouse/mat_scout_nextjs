"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import ModalLayout from "@/components/shared/ModalLayout";
import StyleCard from "./StyleCard";
import StyleForm from "./forms/StyleForm";

const DashboardStyles = () => {
  const { user } = useUser();
  const [myStyles, setMyStyles] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    fetchStyles();
    fetchSummary(); // get logged-in user's totals-by-style
  }, [user?._id]);

  const fetchStyles = async () => {
    try {
      const res = await fetch(`/api/dashboard/${user._id}/userStyles`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch user styles");
      const data = await res.json();
      setMyStyles(Array.isArray(data) ? data : data?.styles || data || []);
    } catch (err) {
      console.error("Error loading user styles:", err);
      toast.error("Could not load styles.");
      setMyStyles([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/results/summary`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load results");
      setResultsMap(data?.byStyle || {});
    } catch (err) {
      console.error("Error loading results summary:", err);
      setResultsMap({});
    }
  };

  const handleStylesRefresh = async () => {
    await Promise.all([fetchStyles(), fetchSummary()]);
  };

  const handleDeleteStyle = (deletedStyleId) => {
    setMyStyles((prevStyles) =>
      prevStyles.filter((style) => style._id !== deletedStyleId)
    );
  };

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
            styleResultsMap={resultsMap}
            onDelete={handleDeleteStyle}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardStyles;
