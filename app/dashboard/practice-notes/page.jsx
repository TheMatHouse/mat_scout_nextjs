"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";
import ModalLayout from "@/components/shared/ModalLayout";
import PracticeNoteModal from "@/components/dashboard/practice-notes/PracticeNoteModal";
import { Calendar, Pencil, Video } from "lucide-react";

/* ---------------- helpers ---------------- */

function formatDate(dt) {
  return new Date(dt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summarizeItems(items = []) {
  const counts = {};
  for (const i of items) {
    counts[i.type] = (counts[i.type] || 0) + 1;
  }
  return counts;
}

function pluralize(count, label) {
  return `${count} ${count === 1 ? label : `${label}s`}`;
}

function sessionBadge(type) {
  const base =
    "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold";

  switch (type) {
    case "clinic":
      return `${base} bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100`;
    case "seminar":
      return `${base} bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-100`;
    case "training-camp":
      return `${base} bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100`;
    default:
      return `${base} bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100`;
  }
}

function formatSessionType(value) {
  if (!value) return "";
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ---------------- page ---------------- */

const PracticeNotesPage = () => {
  const router = useRouter();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);

  /* ---------- filters ---------- */
  const [sessionType, setSessionType] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);
    const res = await fetch("/api/practice-notes", { cache: "no-store" });
    const data = await res.json();
    setNotes(Array.isArray(data?.notes) ? data.notes : []);
    setLoading(false);
  }

  /* ---------- derived filter options ---------- */

  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach((n) =>
      n.items?.forEach((i) => (i.tags || []).forEach((t) => set.add(t)))
    );
    return Array.from(set).sort();
  }, [notes]);

  const allInstructors = useMemo(() => {
    const set = new Set();
    notes.forEach((n) =>
      n.items?.forEach((i) => {
        if (i.externalInstructorName) set.add(i.externalInstructorName);
      })
    );
    return Array.from(set).sort();
  }, [notes]);

  const hasActiveFilters =
    sessionType !== "all" ||
    itemType !== "all" ||
    tagFilter !== "all" ||
    instructorFilter !== "all";

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (sessionType !== "all" && n.sessionType !== sessionType) return false;
      if (itemType !== "all" && !n.items?.some((i) => i.type === itemType))
        return false;
      if (
        tagFilter !== "all" &&
        !n.items?.some((i) => i.tags?.includes(tagFilter))
      )
        return false;
      if (
        instructorFilter !== "all" &&
        !n.items?.some((i) => i.externalInstructorName === instructorFilter)
      )
        return false;
      return true;
    });
  }, [notes, sessionType, itemType, tagFilter, instructorFilter]);

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Practice Notes
          </h1>

          <Button
            className="btn btn-primary"
            onClick={() => {
              setEditNote(null);
              setOpen(true);
            }}
          >
            New Practice Note
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Session */}
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="rounded-lg border px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Sessions</option>
            <option value="practice">Practice</option>
            <option value="clinic">Clinic</option>
            <option value="seminar">Seminar</option>
            <option value="training-camp">Training Camp</option>
          </select>

          {/* Item Type */}
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className="rounded-lg border px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Items</option>
            <option value="warm-up">Warm-ups</option>
            <option value="drill">Drills</option>
            <option value="technique">Techniques</option>
            <option value="cool-down">Cool-downs</option>
          </select>

          {/* Tags (only if present) */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Tags</option>
              {allTags.map((t) => (
                <option
                  key={t}
                  value={t}
                >
                  #{t}
                </option>
              ))}
            </select>
          )}

          {/* Instructors (only if present) */}
          {allInstructors.length > 0 && (
            <select
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              className="rounded-lg border px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Instructors</option>
              {allInstructors.map((n) => (
                <option
                  key={n}
                  value={n}
                >
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setSessionType("all");
                setItemType("all");
                setTagFilter("all");
                setInstructorFilter("all");
              }}
              className="px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Content */}
        {loading && <Spinner />}

        {!loading && filteredNotes.length === 0 && (
          <div className="rounded-xl border p-8 text-center bg-gray-50 dark:bg-gray-900">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              No practice notes found
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const items = note.items || [];
            const item =
              items.length > 0
                ? items[Math.floor(Math.random() * items.length)]
                : null;

            const title = item?.title || "Practice Item";
            const description = item?.description || "";
            const shortDesc =
              description.length > 40
                ? description.slice(0, 40) + "…"
                : description;

            const hasVideo = !!item?.videoUrl;

            const sport = item?.sport || "judo"; // fallback

            function sportBadge(s) {
              const base =
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold";

              switch (s) {
                case "bjj":
                  return `${base} bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100`;
                case "wrestling":
                  return `${base} bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100`;
                default:
                  return `${base} bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100`; // Judo
              }
            }

            return (
              <div
                key={note._id}
                className="rounded-xl border p-4 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between"
              >
                {/* Top */}
                <div className="space-y-2">
                  {/* Item title */}
                  <div className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    {title}
                  </div>

                  {/* Badges */}
                  <div>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm text-white"
                      style={{
                        backgroundColor:
                          sport === "bjj"
                            ? "#0d6efd"
                            : sport === "wrestling"
                            ? "#ffc107"
                            : "#28a745", // Judo (toast success green)
                      }}
                    >
                      {sport.toUpperCase()}

                      {item?.type && (
                        <>
                          <span className="mx-2 opacity-75">•</span>
                          {item.type.charAt(0).toUpperCase() +
                            item.type.slice(1)}
                        </>
                      )}

                      {note.sessionType && (
                        <>
                          <span className="mx-2 opacity-75">•</span>
                          {formatSessionType(note.sessionType)}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                    <Calendar className="w-4 h-4" />
                    {formatDate(note.startAt)}
                  </div>

                  <hr className="border-gray-300 dark:border-gray-700" />

                  {/* Description */}
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {shortDesc || "No description"}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => {
                      setEditNote(note);
                      setOpen(true);
                    }}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>

                  <div className="flex items-center gap-4">
                    {hasVideo && (
                      <Video className="w-4 h-4 text-gray-900 dark:text-gray-100" />
                    )}

                    <button
                      onClick={() =>
                        router.push(`/dashboard/practice-notes/${note._id}`)
                      }
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      <ModalLayout
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditNote(null);
        }}
        withCard
      >
        {open && (
          <PracticeNoteModal
            note={editNote}
            onSaved={loadNotes}
            setOpen={setOpen}
          />
        )}
      </ModalLayout>
    </>
  );
};

export default PracticeNotesPage;
