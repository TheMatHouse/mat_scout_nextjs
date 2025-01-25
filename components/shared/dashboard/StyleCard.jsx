"use client";

import React, { useState } from "react";
import ModalFrame from "../modalContainer/ModalFrame";
import moment from "moment";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// ICONS
import { GrEdit } from "react-icons/gr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import StyleForm from "./forms/Style";
import { Button } from "@/components/ui/button";

const StyleCard = ({ style, styleResults, user, userType }) => {
  const router = useRouter();
  // Edit Style Modal State
  const [showEditStyleModal, setShowEditStyleModal] = useState(false);
  const handleEditStyleShow = () => setShowEditStyleModal(true);
  const handleEditStyleClose = () => setShowEditStyleModal(false);

  const [open, setOpen] = useState(false);
  const handleDelsteStyle = async () => {
    if (window.confirm(`Are you sure you want to delete ${style.styleName}?`)) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${user._id}/userStyle/${style._id}`,
          {
            method: "DELETE",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Content-type": "application/json; charset=UTF-8",
            },
          }
        );
        if (response.status === 200) {
          const data = await response.json();
          const timer = setTimeout(() => {
            router.refresh();
            toast.success(data.message);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        const data = await error.json();
        // console.log("MESSAGE ", data.message);
        toast.error("Unable to update this style ", data.message);
      }
    }
  };

  return (
    <div>
      <div className="font-bold text-2xl mb-2 bg-ms-blue dark:bg-ms-blue-gray text-gray-100">
        <div className="flex p-2 justify-center">
          {style.styleName}

          <Dialog
            open={open}
            onOpenChange={setOpen}
            className="min-w-[800px]"
          >
            <DialogTrigger asChild>
              <GrEdit
                size={32}
                type="button"
                alt={`Edit ${style.styleName}`}
                className="ps-4 cursor-pointer"
              />
              {/* <Button className="bg-gray-900 hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ml-6">
                Add Style
              </Button> */}
            </DialogTrigger>
            <DialogContent className="overflow-y-scroll max-h-[90%]">
              <DialogHeader>
                <DialogTitle>Edit style</DialogTitle>
                <DialogDescription>
                  Make changes to your style here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 min-width-full">
                <StyleForm
                  user={user}
                  style={style}
                  userType="user"
                  setOpen={setOpen}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex flex-col justify-start items-start text-black p-2">
        <div className="pb-2">
          <strong>Rank: </strong>&nbsp;
          {style.rank}
        </div>

        <div className="pb-2">
          <strong>Promotion Date:</strong>&nbsp;
          {moment(style.promotionDate).format("MMMM D, YYYY")}
        </div>

        <div className="pb-2">
          <strong>Division:</strong>&nbsp;
          {style.division}
        </div>

        <div className="pb-2">
          <strong>Weight Class:</strong>&nbsp;
          {style.weightClass}
        </div>

        <div className="pb-2">
          <strong>Grip:</strong>&nbsp;
          {style.grip}
        </div>

        <div className="pb-2">
          <strong>Favorite Technique:</strong>&nbsp;
          {style.favoriteTechnique}
        </div>

        <div className="pb-2">
          <strong>My Record in {style.styleName}:</strong>
          <br />
          <span className="ms-4">
            <strong className="">Wins: </strong>
            {style.styleName === "Brazilian Jiu Jitsu" &&
              `${styleResults && styleResults[0]?.Wins}`}
            {style.styleName === "Judo" &&
              `${styleResults && styleResults[1]?.Wins}`}
            {style.styleName === "Wrestling" &&
              `${styleResults && styleResults[2]?.Wins}`}
            <br />
          </span>
          <span className="ms-4">
            <strong>Losses: </strong>
            {style.styleName === "Brazilian Jiu Jitsu" &&
              `${styleResults && styleResults[0]?.Losses}`}
            {style.styleName === "Judo" &&
              `${styleResults && styleResults[1]?.Losses}`}
            {style.styleName === "Wrestling" &&
              `${styleResults && styleResults[2]?.Losses}`}
          </span>
          <div className="mt-2">View my {style.styleName} (coming soon!)</div>
        </div>
      </div>
      {showEditStyleModal && (
        <ModalFrame
          show={showEditStyleModal}
          handleClose={handleEditStyleClose}
          user={user}
          style={style}
          userType="user"
          modalType="editStyle"
        />
      )}
      <div className="flex justify-center py-3">
        <button
          className="btn hover:bg-gray-500  border-gray-500 dark:border-gray-100 border-2 drop-shadow-md text-ms-dark-red font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          onClick={handleDelsteStyle}
        >
          Delete this style
        </button>
      </div>
    </div>
  );
};

export default StyleCard;
