"use client";

import React, { useState, useEffect } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { useUser } from "@/context/UserContext";
import ModalFrame from "../shared/modalContainer/ModalFrame";
import { GrEdit } from "react-icons/gr";
import StyleCard from "./StyleCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StyleForm from "./forms/StyleForm";

const DashboardStyles = () => {
  const { user } = useUser(); // fetch from context
  const [myStyles, setMyStyles] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

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

    fetchStyles();
  }, [user]);

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
      <div className="flex items-center">
        <h1 className="text-2xl">My Styles/Sports</h1>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          className="min-w-[800px]"
        >
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500 border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
              Add Style
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Add Style</DialogTitle>
              <DialogDescription>
                Add a new style/sport here. You can edit this style at any time.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <StyleForm
                user={user}
                userType="user"
                setOpen={setOpen}
                onSuccess={handleStylesRefresh}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <hr className="inline-block w-full border-t-1 border-gray-100" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 mt-3">
        {myStyles.map((style, index) => (
          <StyleCard
            key={index}
            style={style}
            user={user}
            userType="user"
            styleResults={styleResults}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardStyles;
