"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Editor from "@/components/shared/Editor";
import { Plus } from "lucide-react";

const ITEM_TYPES = ["warm-up", "drill", "technique", "cool-down"];

/* ---------------- local date helpers ---------------- */
function getLocalDateParts(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

/* ---------------- timestamp helper ---------------- */
function parseTimestamp(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);

  const parts = value.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  return null;
}

function PracticeNoteModal({ note, onSaved, setOpen }) {
  const isEdit = !!note;

  /* ---------------- date / time ---------------- */
  const initialDateTime = note?.startAt
    ? getLocalDateParts(note.startAt)
    : { date: "", time: "12:00" };

  const [date, setDate] = useState(initialDateTime.date);
  const [time, setTime] = useState(initialDateTime.time);
  const [style, setStyle] = useState(note?.style || "");

  /* ---------------- club search ---------------- */
  const [myClubs, setMyClubs] = useState([]);
  const [clubQuery, setClubQuery] = useState("");
  const [clubResults, setClubResults] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const abortRef = useRef(null);

  /* ---------------- practice items ---------------- */
  const [items, setItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState("");

  /* ---------------- load my clubs ---------------- */
  useEffect(() => {
    fetch("/api/teams/mine", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setMyClubs(Array.isArray(data?.myTeams) ? data.myTeams : []);
      })
      .catch(() => {});
  }, []);

  /* ---------------- hydrate edit ---------------- */
  useEffect(() => {
    if (!note) return;

    setStyle(note.style || "");

    setItems(
      (note.items || []).map((i) => ({
        ...i,
        description: i.description || "",
        instructorName: i.externalInstructorName || "",
        tags: Array.isArray(i.tags) ? i.tags.join(", ") : "",
        youtubeUrl: i.videoUrl || "",
        timestamp:
          typeof i.videoTimestamp === "number" ? String(i.videoTimestamp) : "",
      })),
    );

    setGeneralNotes(note.generalNotes || "");

    if (note.club) {
      const match = myClubs.find((c) => c._id === note.club);
      if (match) {
        setSelectedTeam(match);
        setClubQuery(match.teamName);
      }
    } else if (note.externalClubName) {
      setClubQuery(note.externalClubName);
    }
  }, [note, myClubs]);

  /* ---------------- helpers ---------------- */
  function updateItem(i, field, value) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        type: "",
        title: "",
        description: "",
        instructorName: "",
        tags: "",
        youtubeUrl: "",
        timestamp: "",
      },
    ]);
  }

  /* ---------------- submit ---------------- */
  async function handleSubmit(e) {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    if (!style) {
      toast.error("Please select a style (Judo, BJJ, or Wrestling).");
      return;
    }

    if (!selectedTeam && !clubQuery.trim()) {
      toast.error("Please select or enter a club.");
      return;
    }

    // ✅ FIXED TIME: NO timezone math
    const startAt = new Date(`${date}T${time}`).toISOString();

    const payload = {
      ...(isEdit && { id: note._id }),
      startAt,
      sessionType: e.currentTarget.sessionType.value,
      style,
      clubId: selectedTeam?._id || null,
      externalClubName: selectedTeam ? null : clubQuery.trim(),
      items: items.map((i) => ({
        type: i.type,
        title: i.title,
        description: i.description || "",
        externalInstructorName: i.instructorName || "",
        youtubeUrl: i.youtubeUrl || "",
        videoTimestamp: i.timestamp ? Number(i.timestamp) : null,
        tags: i.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })),
      generalNotes,
    };

    const res = await fetch(
      isEdit ? `/api/practice-notes/${note._id}` : "/api/practice-notes",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      toast.success(isEdit ? "Updated" : "Created");
      onSaved?.();
      setOpen(false);
    } else {
      toast.error("Failed to save practice note.");
    }
  }

  /* ---------------- render ---------------- */
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Date / Session */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
        <select
          name="sessionType"
          defaultValue={note?.sessionType || "practice"}
          className="border rounded-lg px-3 py-2"
        >
          <option value="practice">Practice</option>
          <option value="clinic">Clinic</option>
          <option value="seminar">Seminar</option>
          <option value="training-camp">Training Camp</option>
        </select>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          required
          className="border rounded-lg px-3 py-2"
        >
          <option
            value=""
            disabled
          >
            Select your style / sport
          </option>
          <option value="judo">Judo</option>
          <option value="bjj">Brazilian Jiu-Jitsu</option>
          <option value="wrestling">Wrestling</option>
        </select>
      </div>

      {/* ---------------- Club ---------------- */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Club
          </h3>
          <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
            Choose one of your clubs or search for another club below.
          </p>
        </div>

        {myClubs.length > 0 && (
          <div className="grid gap-2">
            {myClubs.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => {
                  setSelectedTeam(t);
                  setClubQuery(t.teamName);
                  setClubResults([]);
                }}
                className="text-left px-4 py-3 rounded-lg border bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {t.teamName}
                </div>
                {(t.city || t.state) && (
                  <div className="text-xs text-gray-900 dark:text-gray-100">
                    {[t.city, t.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedTeam && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-ms-blue to-ms-dark-red text-white">
            <div>
              <div className="text-[10px] uppercase opacity-80">
                Selected Club
              </div>
              <div className="font-semibold">{selectedTeam.teamName}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTeam(null);
                setClubQuery("");
              }}
              className="text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <input
          value={clubQuery}
          disabled={!!selectedTeam}
          onChange={(e) => {
            setClubQuery(e.target.value);
            setSelectedTeam(null);
          }}
          placeholder="Search for a club or enter a new one…"
          className="w-full rounded-lg px-3 py-2 border"
        />

        {clubResults.length > 0 && !selectedTeam && (
          <div className="rounded-lg border overflow-hidden">
            {clubResults.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => {
                  setSelectedTeam(t);
                  setClubQuery(t.teamName);
                  setClubResults([]);
                }}
                className="block w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {t.teamName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Practice Breakdown ---------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Practice Breakdown
            </h3>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
              Add drills, techniques, warm-ups, or cool-downs from this session.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="btn-add"
          >
            <Plus size={16} /> Add Practice Item
          </button>
        </div>

        {items.map((item, i) => (
          <div
            key={i}
            className="border rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <select
                value={item.type}
                onChange={(e) => updateItem(i, "type", e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option
                  value=""
                  disabled
                >
                  Choose type…
                </option>

                {ITEM_TYPES.map((t) => (
                  <option
                    key={t}
                    value={t}
                  >
                    {t.replace("-", " ")}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setItems((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>

            <input
              value={item.title}
              onChange={(e) => updateItem(i, "title", e.target.value)}
              placeholder="Title"
              className="w-full border rounded px-2 py-1 text-sm"
            />

            {/* ✅ instructor field stays as-is in UI; we only map it in payload */}
            <input
              value={item.instructorName || ""}
              onChange={(e) => updateItem(i, "instructorName", e.target.value)}
              placeholder="Instructor / Taught by (optional)"
              className="w-full border rounded px-2 py-1 text-sm"
            />

            <div className="space-y-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Description
              </div>

              <Editor
                text={item.description}
                onChange={(val) => updateItem(i, "description", val)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={item.youtubeUrl || ""}
                onChange={(e) => updateItem(i, "youtubeUrl", e.target.value)}
                placeholder="YouTube URL"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <input
                value={item.timestamp || ""}
                onChange={(e) => updateItem(i, "timestamp", e.target.value)}
                placeholder="Timestamp (e.g. 2:35)"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            <input
              value={item.tags}
              onChange={(e) => updateItem(i, "tags", e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        ))}
      </div>

      {/* ---------------- General Notes ---------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          General Notes
        </h3>
        <Editor
          text={generalNotes}
          onChange={setGeneralNotes}
        />
      </div>

      <button
        type="submit"
        className="w-full btn-submit"
      >
        {isEdit ? "Save Changes" : "Create Practice Note"}
      </button>
    </form>
  );
}

export default PracticeNoteModal;
