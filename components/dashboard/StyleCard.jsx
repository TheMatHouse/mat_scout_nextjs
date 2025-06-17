"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import moment from "moment";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { GrEdit } from "react-icons/gr";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import StyleForm from "./forms/StyleForm";

const StyleCard = ({
  style: initialStyle,
  styleResults,
  user,
  userType,
  onDelete,
  member,
}) => {
  const router = useRouter();
  const [style, setStyle] = useState(initialStyle);
  const [open, setOpen] = useState(false);
  const { refreshUser } = useUser();

  const handleDeleteStyle = async () => {
    if (window.confirm(`Delete ${style.styleName}?`)) {
      try {
        const userId = member?.userId || user?._id;

        const endpoint =
          userType === "family"
            ? `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}/family/${member._id}/styles/${style._id}`
            : `${process.env.NEXT_PUBLIC_API_DOMAIN}/dashboard/${userId}/userStyles/${style._id}`;

        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        if (response.ok) {
          toast.success(data.message);
          refreshUser();
          if (onDelete) {
            onDelete(style._id); // Inform parent immediately
          }
        } else {
          toast.error(data.message || "Failed to delete style.");
        }
      } catch {
        toast.error("Server error while deleting style.");
      }
    }
  };

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
            <StyleForm
              user={user}
              style={style}
              userType={userType}
              setOpen={setOpen}
              onSuccess={(updated) => setStyle(updated)}
              member={member}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3 text-sm sm:text-base leading-relaxed">
        <div>
          <span className="font-semibold text-slate-300">Rank:</span>{" "}
          {style.rank}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Promotion Date:</span>{" "}
          {moment.utc(style.promotionDate).format("MMMM D, YYYY")}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Division:</span>{" "}
          {style.division}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Weight Class:</span>{" "}
          {style.weightClass}
        </div>
        <div>
          <span className="font-semibold text-slate-300">Grip:</span>{" "}
          {style.grip}
        </div>
        <div>
          <span className="font-semibold text-slate-300">
            Favorite Technique:
          </span>{" "}
          {style.favoriteTechnique}
        </div>
        <div>
          <span className="font-semibold text-slate-300">
            My Record in {style.styleName}:
          </span>
          <div className="ml-4 space-y-1">
            <div>
              <strong>Wins:</strong>{" "}
              {styleResults?.[
                style.styleName === "Judo"
                  ? 1
                  : style.styleName === "Brazilian Jiu Jitsu"
                  ? 0
                  : 2
              ]?.Wins ?? 0}
            </div>
            <div>
              <strong>Losses:</strong>{" "}
              {styleResults?.[
                style.styleName === "Judo"
                  ? 1
                  : style.styleName === "Brazilian Jiu Jitsu"
                  ? 0
                  : 2
              ]?.Losses ?? 0}
            </div>
          </div>
        </div>
        <div className="italic text-xs text-slate-400 pt-1">
          View my {style.styleName} (coming soon!)
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-center py-4">
        <button
          onClick={handleDeleteStyle}
          className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md transition"
        >
          Delete this style
        </button>
      </div>
    </div>
  );
};

export default StyleCard;
