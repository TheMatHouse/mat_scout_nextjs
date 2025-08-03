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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    fetchStyles();
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

  // Compute style results for stats
  const styleResults = [
    { name: "Brazilian Jiu Jitsu", Wins: 0, Losses: 0 },
    { name: "Judo", Wins: 0, Losses: 0 },
    { name: "Wrestling", Wins: 0, Losses: 0 },
  ];

  user?.matchReports?.forEach((match) => {
    const update = (index) => {
      if (match.result === "Won") styleResults[index].Wins += 1;
      else if (match.result === "Lost") styleResults[index].Losses += 1;
    };

    if (match.matchType === "Brazilian Jiu Jitsu") update(0);
    else if (match.matchType === "Judo") update(1);
    else if (match.matchType === "Wrestling") update(2);
  });

  return (
    <div>
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
        {myStyles.map((style, index) => (
          <StyleCard
            key={index}
            style={style}
            user={user}
            userType="user"
            styleResults={styleResults}
            onDelete={handleDeleteStyle}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardStyles;
