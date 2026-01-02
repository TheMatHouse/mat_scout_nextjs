"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";
import { CheckCircle2 } from "lucide-react";

const DISCIPLINE_OPTIONS = [
  "Judo",
  "BJJ",
  "Wrestling",
  "MMA",
  "Strength & Conditioning",
  "Other",
];

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function AthleteCheckIn({ athleteId = null }) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  // ---- date ----
  const [date, setDate] = useState(todayISO());

  // ---- my clubs ----
  const [myClubs, setMyClubs] = useState([]);

  // ---- club search ----
  const [clubQuery, setClubQuery] = useState("");
  const [clubResults, setClubResults] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const abortRef = useRef(null);

  // ---- details ----
  const [discipline, setDiscipline] = useState("");
  const [visibility, setVisibility] = useState("public");

  // ---- auto focus next ----
  const disciplineRef = useRef(null);
  const submitRef = useRef(null);

  /* ---------------- Load my clubs ---------------- */
  useEffect(() => {
    if (!showDetails) return;

    fetch("/api/teams/mine", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setMyClubs(Array.isArray(data?.myTeams) ? data.myTeams : []);
      })
      .catch(() => {});
  }, [showDetails]);

  useEffect(() => {
    if (!showDetails || myClubs.length === 0) return;

    const lastClubId = localStorage.getItem("lastCheckInClubId");
    if (!lastClubId) return;

    const match = myClubs.find((t) => t._id === lastClubId);
    if (!match) return;

    setSelectedTeam(match);
    setClubQuery(match.teamName);
  }, [showDetails, myClubs]);

  /* ---------------- Club search ---------------- */
  useEffect(() => {
    const q = clubQuery.trim();
    if (q.length < 2 || selectedTeam) {
      setClubResults([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/teams?name=${encodeURIComponent(q)}&limit=8`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        setClubResults(Array.isArray(data?.teams) ? data.teams : []);
      })
      .catch(() => {});
  }, [clubQuery, selectedTeam]);

  /* ---------------- Submit ---------------- */
  async function submitCheckIn() {
    if (!selectedTeam && !clubQuery.trim()) {
      toast.error("Please select or enter a club.");
      return;
    }

    try {
      setLoading(true);

      const attendedAt = new Date(`${date}T12:00:00`).toISOString();

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendedAt,
          teamId: selectedTeam?._id || null,
          teamName: selectedTeam ? null : clubQuery.trim(),
          discipline: discipline || null,
          visibility,
          athleteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("You're already checked in recently.");
          return;
        }
        throw new Error(data?.error || "Check-in failed");
      }

      toast.success("Practice logged 💪");
      if (selectedTeam?._id) {
        localStorage.setItem("lastCheckInClubId", selectedTeam._id);
      }

      setClubQuery("");
      setSelectedTeam(null);
      setClubResults([]);
      setDiscipline("");
      setDate(todayISO());
      setShowDetails(false);
    } catch {
      toast.error("Failed to check in.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="relative rounded-3xl p-8 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617] border border-white/10">
      {successFlash && (
        <div
          className="
          absolute inset-0 z-20
          flex items-center justify-center
          rounded-3xl
          bg-black/60 backdrop-blur-sm
        "
        >
          <div className="flex flex-col items-center gap-3 text-white">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
            <div className="text-xl font-extrabold">Checked In!</div>
          </div>
        </div>
      )}
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        <Zap className="w-10 h-10 text-white" />
        <h2 className="text-3xl font-extrabold text-white">
          Practice Check-In
        </h2>

        {!showDetails && (
          <Button
            onClick={() => setShowDetails(true)}
            className="
      px-7 py-3 text-base font-bold rounded-xl
      bg-gradient-to-r from-ms-blue to-ms-dark-red
      text-white
      shadow-lg
      hover:scale-[1.04] hover:shadow-xl
      transition
    "
          >
            Check-In with Details
          </Button>
        )}
      </div>

      {showDetails && (
        <div className="relative z-10 mt-8 space-y-4">
          {/* Date */}
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-white"
          />

          {/* My Clubs */}
          {myClubs.length > 0 && (
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Your Clubs
              </label>
              <div className="grid grid-cols-1 gap-3">
                {myClubs.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(t);
                      setClubQuery(t.teamName);
                      setClubResults([]);

                      setTimeout(() => {
                        disciplineRef.current?.focus();
                      }, 0);
                    }}
                    className="
        flex items-center justify-between
        px-4 py-4 rounded-xl
        bg-gradient-to-br from-gray-800 to-gray-900
        border border-white/10
        text-left
        hover:from-gray-700 hover:to-gray-800
        hover:scale-[1.01]
        transition
      "
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {t.teamName}
                      </div>
                      {(t.city || t.state) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[t.city, t.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="text-xs px-2 py-1 rounded-full bg-ms-blue/20 text-ms-blue">
                      Select
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTeam && (
            <div
              className="
      flex items-center justify-between gap-3
      px-3.5 py-2 rounded-lg
      bg-gradient-to-r from-ms-blue to-ms-dark-red
      text-white
      shadow-sm
      border border-white/20
    "
            >
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] uppercase tracking-wide opacity-80">
                  Selected Club
                </span>
                <span className="text-sm font-extrabold">
                  {selectedTeam.teamName}
                </span>
                {(selectedTeam.city || selectedTeam.state) && (
                  <span className="text-[10px] opacity-90">
                    {[selectedTeam.city, selectedTeam.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTeam(null);
                  setClubQuery("");
                  setTimeout(() => {
                    disciplineRef.current?.focus();
                  }, 0);
                }}
                className="
        flex items-center justify-center
        w-7 h-7 rounded-full
        bg-black/25 hover:bg-black/40
        transition
        text-xs
      "
                title="Change club"
              >
                ✕
              </button>
            </div>
          )}

          {/* Club search */}
          <input
            value={clubQuery}
            disabled={!!selectedTeam}
            onChange={(e) => {
              setClubQuery(e.target.value);
              setSelectedTeam(null);
            }}
            placeholder={
              selectedTeam
                ? "Club selected — click ✕ above to change"
                : "Or search another club…"
            }
            className="
    w-full rounded-lg p-3
    border
    text-white
    transition
    bg-gray-900 border-gray-700
    disabled:bg-gray-800
    disabled:border-gray-600
    disabled:text-gray-400
    disabled:cursor-not-allowed
  "
          />

          {clubResults.length > 0 && !selectedTeam && (
            <div className="rounded-lg bg-gray-900 border border-gray-700">
              {clubResults.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => {
                    setSelectedTeam(t);
                    setClubQuery(t.teamName);
                    setClubResults([]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800 text-white"
                >
                  {t.teamName}
                </button>
              ))}
            </div>
          )}

          {/* Discipline */}
          <select
            ref={disciplineRef}
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-white"
          >
            <option value="">Select discipline…</option>
            {DISCIPLINE_OPTIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <Button
            ref={submitRef}
            onClick={submitCheckIn}
            disabled={loading}
            className="
    w-full mt-4 py-4 text-lg font-extrabold rounded-2xl
    bg-gradient-to-r from-ms-blue to-ms-dark-red
    text-white
    shadow-xl
    hover:scale-[1.03]
    hover:shadow-2xl
    transition
    disabled:opacity-60 disabled:cursor-not-allowed
    flex items-center justify-center gap-3
  "
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Check In
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AthleteCheckIn;
