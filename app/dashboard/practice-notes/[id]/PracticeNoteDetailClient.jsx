"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import ModalLayout from "@/components/shared/ModalLayout";
import PracticeNoteModal from "@/components/dashboard/practice-notes/PracticeNoteModal";
import { Button } from "@/components/ui/button";

function getYouTubeEmbed(url, timestamp) {
  try {
    const u = new URL(url);
    let videoId = null;

    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }

    if (!videoId) return null;

    let embed = `https://www.youtube.com/embed/${videoId}`;
    if (timestamp) embed += `?start=${timestamp}`;

    return embed;
  } catch {
    return null;
  }
}

function formatSessionType(value) {
  if (!value) return "";
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PracticeNoteDetailClient({ note }) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable)
        return;

      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setEditOpen(true);
      }

      if (e.key === "Escape") {
        if (editOpen) setEditOpen(false);
        if (deleteOpen) setDeleteOpen(false);
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        router.push("/dashboard/practice-notes");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editOpen, deleteOpen, router]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);

    const res = await fetch(`/api/practice-notes/${note._id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/dashboard/practice-notes");
    } else {
      setDeleting(false);
      setDeleteOpen(false);
      alert("Failed to delete practice note.");
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {new Date(note.startAt).toLocaleString()}
            </h1>

            <div className="text-base sm:text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">
              {formatSessionType(note.sessionType)}
            </div>

            {note.externalClubName && (
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {note.externalClubName}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/practice-notes"
              className="btn btn-primary"
            >
              Back
            </Link>

            <button
              className="btn btn-primary"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </button>

            <button
              className="btn bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Practice Items */}
        <div className="space-y-8">
          {note.items.map((item, idx) => {
            const embedUrl = item.videoUrl
              ? getYouTubeEmbed(item.videoUrl, item.videoTimestamp)
              : null;

            return (
              <div
                key={idx}
                className="rounded-xl border p-4 sm:p-5 bg-gray-50 dark:bg-gray-900"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6">
                  {/* Left */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold uppercase text-gray-900 dark:text-gray-100">
                        {item.type}
                      </span>

                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        – {item.title}
                      </span>

                      {item.externalInstructorName && (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          · Taught by {item.externalInstructorName}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}

                    {item.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-sm font-semibold text-gray-900 dark:text-gray-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right – Video */}
                  {item.videoUrl && (
                    <div className="w-full">
                      {embedUrl ? (
                        <div className="aspect-video rounded-lg overflow-hidden border">
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-semibold"
                        >
                          Watch video
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* General Notes */}
        {note.generalNotes && (
          <div className="rounded-xl border p-5 sm:p-6 bg-gray-50 dark:bg-gray-900 space-y-4">
            <h2 className="text-lg font-bold">General Notes</h2>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: note.generalNotes }}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ModalLayout
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        withCard
      >
        {editOpen && (
          <PracticeNoteModal
            note={note}
            setOpen={setEditOpen}
            onSaved={() => {
              setEditOpen(false);
              router.refresh();
            }}
          />
        )}
      </ModalLayout>

      {/* Delete Confirm Modal */}
      <ModalLayout
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        withCard
      >
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-red-600">
            Delete Practice Note?
          </h2>

          <p className="text-sm">
            This will permanently delete this practice note and all of its
            items. This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </ModalLayout>
    </>
  );
}

export default PracticeNoteDetailClient;
