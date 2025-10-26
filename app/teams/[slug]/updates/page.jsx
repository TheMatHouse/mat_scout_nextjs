// app/teams/[slug]/updates/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { toast } from "react-toastify";
import ModalLayout from "@/components/shared/ModalLayout";
import TeamUpdateForm from "@/components/teams/forms/TeamUpdateForm";
import { Edit, Trash } from "lucide-react";

/* ---------- helpers ---------- */
function idsEqual(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export default function TeamUpdatesPage() {
  const { slug } = useParams();
  const { user } = useUser();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCompose, setShowCompose] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Role/ownership
  const [myRole, setMyRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/updates?ts=${Date.now()}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load updates");
      setUpdates(Array.isArray(data.updates) ? data.updates : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load updates");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadRoleAndOwnership = useCallback(async () => {
    // We’ll try members first for role, then fetch the team doc to confirm ownership.
    try {
      // 1) What does the members endpoint think my role is?
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/members?ts=${Date.now()}`
      );
      if (res.ok) {
        const data = await res.json();
        const mine = (data.members || []).find((m) => m.userId === user?._id);
        setMyRole(mine?.role || null);
      } else {
        setMyRole(null);
      }
    } catch {
      setMyRole(null);
    }

    try {
      // 2) Confirm ownership from the team doc directly (handles missing TeamMember rows)
      const resTeam = await fetch(
        `/api/teams/${encodeURIComponent(slug)}?select=owner&ts=${Date.now()}`
      );
      if (resTeam.ok) {
        const team = await resTeam.json();
        // Support both shapes: {owner: "..."} or {team: {owner: "..."}} if your API wraps it
        const ownerId = team?.owner || team?.team?.owner;
        setIsOwner(idsEqual(ownerId, user?._id));
      } else {
        setIsOwner(false);
      }
    } catch {
      setIsOwner(false);
    }
  }, [slug, user?._id]);

  useEffect(() => {
    loadUpdates();
    loadRoleAndOwnership();
  }, [loadUpdates, loadRoleAndOwnership]);

  const canPost = useMemo(() => {
    // Owners, managers, and coaches can post.
    return isOwner || myRole === "manager" || myRole === "coach";
  }, [isOwner, myRole]);

  const handleCreateOrEditSuccess = (newOrEdited) => {
    if (newOrEdited?._id) {
      setUpdates((prev) => {
        const idx = prev.findIndex((u) => u._id === newOrEdited._id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newOrEdited;
          return next;
        }
        return [newOrEdited, ...prev];
      });
    } else {
      loadUpdates();
    }
  };

  const handleDelete = async (u) => {
    if (!u?._id) return;
    if (!window.confirm("Delete this update? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(slug)}/updates/${encodeURIComponent(
          u._id
        )}`,
        { method: "DELETE" }
      );
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        const msg = data?.error || `Failed to delete (HTTP ${res.status})`;
        throw new Error(msg);
      }
      toast.success("Update deleted.");
      setUpdates((prev) => prev.filter((x) => x._id !== u._id));
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete update.");
    }
  };

  const canEdit = (u) =>
    // Owners can edit anything
    isOwner ||
    // Managers/coaches can edit anything
    myRole === "manager" ||
    myRole === "coach" ||
    // Authors can edit their own
    (u?.author?._id && idsEqual(u.author._id, user?._id)) ||
    // Site admins override
    user?.isAdmin;

  const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, "");

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
      {/* Header + Post button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Updates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Announcements and important info from your coaches.
          </p>
        </div>

        {canPost && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setShowCompose(true);
            }}
          >
            Post Update
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-500">Loading updates…</p>
      ) : updates.length === 0 ? (
        <p className="text-gray-500">No updates yet.</p>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => {
            const preview = stripHtml(u.body).slice(0, 240);
            const showMore = stripHtml(u.body).length > 240;
            return (
              <div
                key={u._id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="text-left"
                    onClick={() => setViewing(u)}
                    title="View update"
                  >
                    {/* Always underlined so it's obviously clickable */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white underline underline-offset-4 decoration-2">
                      {u.title}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      by {u.authorName || "—"} •{" "}
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString()
                        : "—"}
                    </div>
                  </button>

                  {/* Icon actions */}
                  {canEdit(u) && (
                    <div className="flex items-center gap-2">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => {
                          setEditing(u);
                          setShowCompose(true);
                        }}
                      >
                        <Edit className="w-5 h-5 text-blue-500" />
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview body (truncated) with "More →" */}
                <div className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                  {preview}
                  {showMore && (
                    <>
                      {" "}
                      <button
                        onClick={() => setViewing(u)}
                        className="underline underline-offset-4 decoration-2"
                        style={{
                          color: "inherit",
                          textDecorationColor: "currentColor",
                        }}
                        aria-label="Read full update"
                      >
                        More →
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose / Edit modal */}
      <ModalLayout
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        title={editing ? "Edit Update" : "Post Update"}
        description={
          editing ? "Update your announcement." : "Share news with your team."
        }
        withCard
      >
        <TeamUpdateForm
          slug={slug}
          initial={editing}
          onSuccess={handleCreateOrEditSuccess}
          onClose={() => setShowCompose(false)}
        />
      </ModalLayout>

      {/* View modal */}
      <ModalLayout
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title || "Update"}
        description={
          viewing?.author?.name
            ? `by ${viewing.author.name} • ${
                viewing.createdAt
                  ? new Date(viewing.createdAt).toLocaleString()
                  : ""
              }`
            : ""
        }
        withCard
      >
        {viewing ? (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: viewing.body || "" }}
          />
        ) : null}
      </ModalLayout>
    </div>
  );
}
