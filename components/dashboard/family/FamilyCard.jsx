"use client";
import React from "react";
import Image from "next/image";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

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
      onDelete(member._id);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Error deleting");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl shadow-md overflow-hidden p-4 text-center bg-card cursor-pointer hover:shadow-lg transition"
    >
      <Image
        src={member.avatar}
        alt={`${member.firstName} ${member.lastName}`}
        width={100}
        height={100}
        className="rounded-full object-cover mb-3 mx-auto"
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
          onClick={(e) => {
            e.stopPropagation();
            toast.info("Public profile not available yet.");
          }}
          aria-label="View Profile"
        >
          <Eye className="h-5 w-5 text-muted-foreground hover:text-primary" />
        </button>

        <button
          onClick={handleDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
};

export default FamilyCard;
