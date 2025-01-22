"use client";

import React, { useState } from "react";
import moment from "moment";
import ModalFrame from "../modalContainer/ModalFrame";
import { GrEdit } from "react-icons/gr";
import StyleCard from "./StyleCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StyleForm from "./forms/Style";

const DashboardStyles = ({ user, userType }) => {
  const myStyles = user?.userStyles;
  console.log(user);

  // Add Style Modal State
  const [showAddStyleModal, setShowAddStyleModal] = useState(false);
  const handleAddStyleShow = () => setShowAddStyleModal(true);
  const handleAddStyleClose = () => setShowAddStyleModal(false);

  const scoutingReportsSharedWithMe = user
    ? user?.scoutingReportsSharedWithMe
    : "";
  const styleResults = [
    {
      name: "Brazilian Jiu Jitsu",
      Wins: 0,
      Losses: 0,
    },
    {
      name: "Judo",
      Wins: 0,
      Losses: 0,
    },
    {
      name: "Wrestling",
      Wins: 0,
      Losses: 0,
    },
  ];

  user &&
    user?.matchReports?.length > 0 &&
    user.matchReports?.map((match) => {
      if (match.matchType === "Brazilian Jiu Jitus") {
        if (match.result === "Won") {
          styleResults[0].Wins = styleResults[0].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[0].Losses = styleResults[0].Losses + 1;
        }
      } else if (match.matchType === "Judo") {
        if (match.result === "Won") {
          styleResults[1].Wins = styleResults[1].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[1].Losses = styleResults[1].Losses + 1;
        }
      } else if (match.matchType === "Wrestling") {
        if (match.result === "Won") {
          styleResults[2].Wins = styleResults[2].Wins + 1;
        } else if (match.result === "Lost") {
          styleResults[2].Losses = styleResults[2].Losses + 1;
        }
      }
    });
  return (
    <div>
      <div className="flex items-center">
        <h1 className="text-2xl">My Styles/Sports</h1>
        <button
          className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6"
          onClick={handleAddStyleShow}
        >
          Add Style
        </button>
        <Dialog className="min-w-[800px]">
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
              Add Style
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-y-scroll max-h-[90%]">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 min-width-full">
              <StyleForm
                user={user}
                userType="user"
                handleClose={handleAddStyleClose}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <hr className="inline-block w-full border-t-1 border-gray-100" />
      <div className="grid grid-cols-3 gap-4">
        {myStyles &&
          myStyles.map((style, index) => (
            <div
              key={index}
              className="max-w-sm rounded overflow-hidden shadow-lg bg-gray-300 mt-2"
            >
              <StyleCard
                style={style}
                user={user}
                userType={userType}
                styleResults={styleResults}
              />
            </div>
          ))}
      </div>

      {showAddStyleModal && (
        <ModalFrame
          show={showAddStyleModal}
          handleClose={handleAddStyleClose}
          user={user}
          userType="user"
          modalType="addStyle"
        />
      )}
    </div>
  );
};

export default DashboardStyles;
