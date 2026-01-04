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

function MemberRow({
  member, // { id, name, username, avatarUrl, role, isOwner, isFamilyMember, userId, familyMemberId }
  slug,
  viewerRole, // may be undefined if owner is not in teammembers
  viewerIsOwner = false, // ✅ NEW: pass true if current user is team.user
  onRoleChange,
}) {
  const [role, setRole] = useState((member.role || "").toLowerCase());
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const normalizedViewerRole = (viewerRole || "").toLowerCase();

  // ✅ If you're the team owner (team.user), treat you as "owner" even if you're not in teammembers
  const effectiveViewerRole = viewerIsOwner ? "owner" : normalizedViewerRole;

  const roleLabel = (r) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "");

  /* -------------------------------------------------------------
     Permission helpers
  ------------------------------------------------------------- */
  const canEditRole = useMemo(() => {
    if (member.isOwner) return false;
    return ["owner", "manager"].includes(effectiveViewerRole);
  }, [effectiveViewerRole, member.isOwner]);

  const canRemove = useMemo(() => {
    if (member.isOwner) return false;

    if (effectiveViewerRole === "owner") return true;

    if (effectiveViewerRole === "manager") {
      return ["member", "coach"].includes(role);
    }

    if (effectiveViewerRole === "coach") {
      return role === "member";
    }

    return false;
  }, [effectiveViewerRole, role, member.isOwner]);

  /* -------------------------------------------------------------
     Role change
  ------------------------------------------------------------- */
  const handleChange = async (newRole) => {
    if (!canEditRole) return;
    if (newRole === role) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/teams/${slug}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
        cache: "no-store",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update role");
      }

      setRole(newRole);
      toast.success("Member updated");
      onRoleChange?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------------
     Remove member (role → declined)
  ------------------------------------------------------------- */
  const handleRemove = async () => {
    try {
      setSaving(true);

      const res = await fetch(`/api/teams/${slug}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
        cache: "no-store",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to remove member");
      }

      toast.success("Member removed from team");
      onRoleChange?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Removal failed");
    } finally {
      setSaving(false);
      setConfirmRemove(false);
    }
  };

  const profileHref = member?.username
    ? member.isFamilyMember
      ? `/family/${member.username}`
      : `/${member.username}`
    : null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-12 items-start sm:items-center gap-3 py-3">
        {/* Identity */}
        <div className="sm:col-span-7 flex items-center gap-3 min-w-0">
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
                  className="hover:underline"
                >
                  {member.name || member.username || "—"}
                </Link>
              ) : (
                member.name || member.username || "—"
              )}
            </span>
            <div className="flex gap-2 text-xs text-gray-500">
              {member.username && <span>@{member.username}</span>}
              {member.isOwner && <span className="text-amber-600">Owner</span>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="sm:col-span-5 flex justify-end gap-2">
          {canEditRole ? (
            <Select
              value={role}
              onValueChange={handleChange}
              disabled={saving}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="pending"
                  disabled
                >
                  Pending
                </SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                {effectiveViewerRole === "owner" && (
                  <SelectItem value="manager">Manager</SelectItem>
                )}
              </SelectContent>
            </Select>
          ) : (
            <span className="px-2 py-1 rounded bg-muted text-sm">
              {roleLabel(role)}
            </span>
          )}

          {canRemove && (
            <button
              onClick={() => setConfirmRemove(true)}
              className="px-3 py-1 rounded border border-red-300 text-red-600 text-sm hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Remove team member?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              This will remove the athlete from the team and permanently delete
              any coach’s notes and scouting reports associated with them.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={saving}
                className="btn btn-destructive"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MemberRow;
