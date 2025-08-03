"use client";

import { useState } from "react";
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

  // Use avatarUrl returned by API
  const displayAvatar = member.avatarUrl;
  const avatarSrc =
    displayAvatar && displayAvatar.startsWith("https://res.cloudinary.com/")
      ? displayAvatar.replace("/upload/", "/upload/f_auto/")
      : displayAvatar;

  // ✅ Determine profile link
  const profileLink =
    member.isFamilyMember === true
      ? `/family/${member.username}`
      : `/${member.username}`;

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
      onRoleChange();
    } catch (err) {
      console.error(err);
      toast.error("Could not update role");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
      {/* ✅ Avatar + Name as clickable link */}
      <Link
        href={profileLink}
        className="flex items-center gap-3 hover:underline"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={member.name}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full" />
        )}
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {member.name}
        </span>
      </Link>

      {/* ✅ Role Dropdown */}
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
