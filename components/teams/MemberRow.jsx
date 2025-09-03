// components/teams/MemberRow.jsx
"use client";

import Link from "next/link"; // ⬅️ added
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
    <div className="flex items-center justify-between">
      {/* Left: identity */}
      <div className="flex items-center gap-3">
        <img
          src={member.avatarUrl || "/default-avatar.png"}
          alt={member.name || "Member"}
          className="h-8 w-8 rounded-full border"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {profileHref ? (
              <Link
                href={profileHref}
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 rounded"
                title={`View ${member.username}'s profile`}
              >
                {member.name || member.username || "—"}
              </Link>
            ) : (
              member.name || member.username || "—"
            )}
          </span>

          {member.username && (
            <span className="text-xs text-muted-foreground">
              @{member.username}
            </span>
          )}

          {member.isOwner && (
            <span className="text-xs text-amber-600">Team Owner</span>
          )}
        </div>
      </div>

      {/* Right: role control or label */}
      <div className="min-w-[200px]">
        {isManager && !member.isOwner ? (
          <Select
            value={role}
            onValueChange={handleChange}
            disabled={saving}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-sm">
            {roleLabel(role || (member.isOwner ? "manager" : "member"))}
          </span>
        )}
      </div>
    </div>
  );
}
