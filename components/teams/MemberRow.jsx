"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "react-toastify";

export default function MemberRow({ member, slug, isManager, onRoleChange }) {
  const [role, setRole] = useState(member.role);

  // Derive safe fields (support a few shapes your API might return)
  const username = useMemo(() => {
    return (
      member?.username ||
      member?.user?.username ||
      member?.family?.username ||
      null
    );
  }, [member]);

  const isFamily = useMemo(() => {
    return (
      member?.isFamilyMember === true ||
      member?.type === "family" ||
      !!member?.family
    );
  }, [member]);

  const displayName = useMemo(() => {
    return (
      member?.name ||
      [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
      member?.user?.name ||
      username ||
      "Member"
    );
  }, [member, username]);

  // Avatar (optimize Cloudinary, tolerate missing)
  const displayAvatar =
    member?.avatarUrl ||
    member?.user?.avatarUrl ||
    member?.family?.avatarUrl ||
    "";
  const avatarSrc =
    displayAvatar && displayAvatar.startsWith("https://res.cloudinary.com/")
      ? displayAvatar.replace("/upload/", "/upload/f_auto/")
      : displayAvatar;

  // Profile href (only if we have a username)
  const profileHref = username
    ? isFamily
      ? `/family/${username}`
      : `/${username}`
    : null;

  const handleChange = async (newRole) => {
    try {
      const res = await fetch(`/api/teams/${slug}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Update failed");

      setRole(newRole);
      toast.success("Membership updated");
      onRoleChange && onRoleChange();
    } catch (err) {
      console.error(err);
      toast.error("Could not update role");
    }
  };

  // The content we want clickable (avatar + name)
  const Identity = (
    <div className="flex items-center gap-3">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={displayName}
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full" />
      )}
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {displayName}
      </span>
    </div>
  );

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
      {/* If we have a username, link to profile. Otherwise, plain content. */}
      {profileHref ? (
        <Link
          href={profileHref}
          className="hover:underline"
          aria-label={`View ${displayName}'s profile`}
          prefetch={false}
        >
          {Identity}
        </Link>
      ) : (
        Identity
      )}

      {/* Role control (managers only) */}
      {isManager ? (
        <Select
          value={role}
          onValueChange={handleChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="declined">Decline</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-gray-500 dark:text-gray-400">{role}</span>
      )}
    </div>
  );
}
