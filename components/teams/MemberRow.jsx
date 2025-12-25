// components/teams/MemberRow.jsx
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { toast } from "react-toastify";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function MemberRow({
  member, // { id, name, username, avatarUrl, role, isOwner, isFamilyMember, userId, familyMemberId }
  slug,
  isManager,
  onRoleChange,
}) {
  const [role, setRole] = useState((member.role || "").toLowerCase());
  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => {
    return !isManager || member.isOwner || saving;
  }, [isManager, member.isOwner, saving]);

  const roleLabel = (r) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "");

  const handleChange = async (newRole) => {
    if (disabled) return;
    if ((newRole || "").toLowerCase() === (role || "").toLowerCase()) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/teams/${slug}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
        cache: "no-store",
      });

      let detail = "";
      try {
        const txt = await res.text();
        if (txt) {
          const json = JSON.parse(txt);
          detail = json?.error || json?.message || "";
        }
      } catch {}

      if (!res.ok) {
        throw new Error(
          `${res.status} ${res.statusText}${detail ? ` – ${detail}` : ""}`
        );
      }

      setRole(newRole);
      toast.success("Membership updated");
      onRoleChange?.();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // Build profile href when we have a username
  const profileHref = member?.username
    ? member.isFamilyMember
      ? `/family/${member.username}`
      : `/${member.username}`
    : null;

  return (
    // Mobile-first stack; desktop becomes two columns with controls on the right
    <div className="grid grid-cols-1 sm:grid-cols-12 items-start sm:items-center gap-3 py-3">
      {/* Left: identity (avatar, name, meta) */}
      <div className="sm:col-span-7 min-w-0 flex items-center gap-3">
        <img
          src={member.avatarUrl || "/default-avatar.png"}
          alt={member.name || "Member"}
          className="h-8 w-8 rounded-full border shrink-0"
        />
        <div className="min-w-0">
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {profileHref ? (
              <Link
                href={profileHref}
                className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 rounded"
                title={
                  member.username
                    ? `View ${member.username}'s profile`
                    : "View profile"
                }
              >
                {member.name || member.username || "—"}
              </Link>
            ) : (
              member.name || member.username || "—"
            )}
          </span>

          {/* secondary line(s) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {member.username && (
              <span className="text-xs text-muted-foreground truncate">
                @{member.username}
              </span>
            )}
            {member.isOwner && (
              <span className="text-xs text-amber-600">Team Owner</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: controls (drop below on mobile, align right on desktop) */}
      <div className="sm:col-span-5 min-w-0 flex flex-col sm:flex-row sm:justify-end gap-2">
        {isManager && !member.isOwner ? (
          <Select
            value={role}
            onValueChange={handleChange}
            disabled={saving}
          >
            <SelectTrigger
              // compact, consistent width; won't force the row to be wide
              className="w-44 sm:w-56 truncate shrink-0"
              aria-label="Change member role"
            >
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>

            {/* Match the dropdown to the trigger width and keep it inside viewport */}
            <SelectContent
              position="popper"
              sideOffset={4}
              align="start"
              className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]"
            >
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-sm text-gray-900 dark:text-gray-100">
            {roleLabel(role || (member.isOwner ? "manager" : "member"))}
          </span>
        )}
        {/* If you ever add action buttons (Revoke/Approve), they’ll wrap nicely here */}
      </div>
    </div>
  );
}
