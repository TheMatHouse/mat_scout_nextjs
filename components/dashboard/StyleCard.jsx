// components/dashboard/StyleCard.jsx
"use client";

import React, { useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { GrEdit } from "react-icons/gr";
import { useUser } from "@/context/UserContext";

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
  logoUrl, // optional override
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
          if (onDelete) onDelete(style._id);
        } else {
          toast.error(data.message || "Failed to delete style.");
        }
      } catch {
        toast.error("Server error while deleting style.");
      }
    }
  };

  // Compute wins/losses based on style name mapping
  const resultIndex =
    style.styleName === "Judo"
      ? 1
      : style.styleName === "Brazilian Jiu Jitsu"
      ? 0
      : 2;
  const wins = styleResults?.[resultIndex]?.Wins ?? 0;
  const losses = styleResults?.[resultIndex]?.Losses ?? 0;

  // Automatically use style name in PDF URL
  const styleParam = style?.styleName || style?._id || "Judo";

  // Resolve logo: param > env var > blank
  const resolvedLogo = logoUrl || process.env.NEXT_PUBLIC_PDF_LOGO || "";

  const qs = new URLSearchParams();
  if (resolvedLogo) qs.set("logo", resolvedLogo);

  const pdfHref = `/api/records/style/${encodeURIComponent(styleParam)}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

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
          {style.promotionDate
            ? moment.utc(style.promotionDate).format("MMMM D, YYYY")
            : "—"}
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
              <strong>Wins:</strong> {wins}
            </div>
            <div>
              <strong>Losses:</strong> {losses}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-4 gap-3">
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener"
          className="btn btn-white-sm"
        >
          Print PDF Record
        </a>

        <button
          onClick={handleDeleteStyle}
          className="px-3 py-1.5 rounded-lg border border-red-400 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-xs font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default StyleCard;
