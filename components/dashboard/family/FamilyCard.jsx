"use client";
import React from "react";
import Image from "next/image";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Cloudinary delivery helper: inject f_auto,q_auto (+ optional transforms)
function cld(url, extra = "") {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("/upload/")) return url; // skip non-Cloudinary URLs
  const parts = ["f_auto", "q_auto"];
  if (extra) parts.push(extra);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg";

const FamilyCard = ({ member, userId, onDelete }) => {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/dashboard/family/${member._id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete ${member.firstName} ${member.lastName}?`)) return;

    try {
      const res = await fetch(`/api/dashboard/${userId}/family/${member._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Family member deleted");
      onDelete?.(member._id);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Error deleting");
    }
  };

  const baseAvatar = member?.avatar || DEFAULT_AVATAR;
  // Request 200x200; we render at 100x100 for crisp retina
  const avatarUrl =
    cld(baseAvatar, "w_200,h_200,c_fill,g_auto,dpr_auto") || baseAvatar;

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl shadow-md overflow-hidden p-4 text-center bg-card cursor-pointer hover:shadow-lg transition"
    >
      <Image
        src={avatarUrl}
        alt={`${member.firstName} ${member.lastName}`}
        width={100}
        height={100}
        className="rounded-full object-cover mb-3 mx-auto"
        loading="lazy"
        sizes="100px"
      />
      <h3 className="text-lg font-semibold">
        {member.firstName} {member.lastName}
      </h3>
      <p className="text-sm text-muted-foreground">@{member.username}</p>
      {member.gender && (
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {member.gender}
        </p>
      )}

      <div className="flex justify-center gap-3 mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.info("Public profile not available yet.");
          }}
          aria-label="View Profile"
          className="p-1"
        >
          <Eye className="h-5 w-5 text-muted-foreground hover:text-primary" />
        </button>

        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete"
          className="p-1"
        >
          <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
};

export default FamilyCard;
