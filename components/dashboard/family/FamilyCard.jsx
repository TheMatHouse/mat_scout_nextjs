"use client";
import React, { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Trash2, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Cloudinary helper: inject f_auto,q_auto (+ optional transforms)
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

  // Build image URL with Cloudinary transforms; fallback if it fails
  const baseSrc =
    member?.avatar && typeof member.avatar === "string"
      ? member.avatar
      : DEFAULT_AVATAR;
  const [imgSrc, setImgSrc] = useState(baseSrc);
  const transformedSrc = useMemo(
    () => cld(imgSrc, "w_200,h_200,c_fill,g_face,dpr_auto"),
    [imgSrc]
  );
  const onImgError = useCallback(() => {
    if (imgSrc !== DEFAULT_AVATAR) setImgSrc(DEFAULT_AVATAR);
  }, [imgSrc]);

  const goDashboard = useCallback(() => {
    router.push(`/dashboard/family/${member._id}`);
  }, [member?._id, router]);

  const handleCardClick = () => {
    goDashboard();
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

  const fullName = `${member?.firstName ?? ""} ${
    member?.lastName ?? ""
  }`.trim();
  const hasUsername = typeof member?.username === "string" && member.username;
  const gender =
    typeof member?.gender === "string" && member.gender !== "not specified"
      ? member.gender
      : null;

  return (
    <div
      onClick={handleCardClick}
      className="
        group relative overflow-hidden cursor-pointer
        rounded-2xl border border-gray-200 dark:border-gray-800
        bg-white dark:bg-slate-900
        shadow-sm hover:shadow-md transition
      "
      title="Open member dashboard"
    >
      {/* Top clickable region -> Dashboard */}
      <div className="p-6 pb-4 flex flex-col items-center">
        <div className="relative">
          <Image
            src={transformedSrc || DEFAULT_AVATAR}
            alt={fullName || "Family member"}
            width={100}
            height={100}
            className="rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-800"
            onError={onImgError}
            loading="lazy"
            sizes="100px"
          />
        </div>

        <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white text-center line-clamp-1">
          {fullName || "Unnamed"}
        </h3>

        {/* Chips row — stop propagation so links don't trigger dashboard */}
        <div
          className="mt-1 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {hasUsername && (
            <Link
              href={`/family/${member.username}`}
              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Open public profile"
            >
              @{member.username}
            </Link>
          )}
          {gender && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 capitalize">
              {gender}
            </span>
          )}
        </div>
      </div>

      <div className="mx-6 border-t border-gray-200 dark:border-gray-800" />

      {/* Footer — left button goes to dashboard; right Eye to public; Delete */}
      <div
        className="p-4 flex items-center justify-between gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={goDashboard}
          className="
            inline-flex items-center gap-1 text-xs
            text-gray-600 dark:text-gray-300
            hover:text-blue-600 transition
          "
          title="Open member dashboard"
        >
          <span className="hidden sm:inline">Open dashboard</span>
          <span className="sm:hidden">Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {hasUsername && (
            <Link
              href={`/family/${member.username}`}
              title="Open public profile"
              className="
                inline-flex items-center justify-center
                rounded-lg p-2 transition
                text-gray-600 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800
                hover:text-blue-600
              "
            >
              <Eye className="h-5 w-5" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete"
            className="
              inline-flex items-center justify-center
              rounded-lg p-2 transition
              text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
              hover:text-red-600
            "
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hover sheen */}
      <div
        className="
          pointer-events-none absolute inset-x-0 top-0 h-1/3 opacity-0
          group-hover:opacity-100 transition
          bg-gradient-to-b from-slate-50/70 via-transparent to-transparent
          dark:from-white/5
        "
      />
    </div>
  );
};

export default FamilyCard;
