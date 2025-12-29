"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";

const DISCIPLINE_OPTIONS = [
  "Judo",
  "BJJ",
  "Wrestling",
  "MMA",
  "Strength & Conditioning",
  "Other",
];

function AthleteCheckIn({ athleteId = null }) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ---- club search ----
  const [clubQuery, setClubQuery] = useState("");
  const [clubResults, setClubResults] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const abortRef = useRef(null);

  // ---- details ----
  const [discipline, setDiscipline] = useState("");
  const [visibility, setVisibility] = useState("public");

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
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Club search failed:", err);
        }
      });
  }, [clubQuery, selectedTeam]);

  /* ---------------- Submit ---------------- */
  async function submitCheckIn() {
    if (!selectedTeam && !clubQuery.trim()) {
      toast.error("Please select or enter a club.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendedAt: new Date().toISOString(),
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

      setClubQuery("");
      setSelectedTeam(null);
      setClubResults([]);
      setDiscipline("");
      setShowDetails(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to check in.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Render ---------------- */
  return (
    <div
      className="
        relative rounded-3xl p-8
        bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617]
        border border-white/10
        shadow-[0_0_0_2px_rgba(59,130,246,0.3),0_25px_50px_-12px_rgba(0,0,0,0.8)]
      "
    >
      {/* Accent glow */}
      <div className="absolute inset-0 rounded-3xl ring-2 ring-ms-blue/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        <div
          className="
    flex items-center justify-center
    w-16 h-16 rounded-full
    bg-gradient-to-br from-ms-blue to-ms-dark-red
    shadow-[0_0_0_6px_rgba(59,130,246,0.15),0_10px_25px_rgba(0,0,0,0.6)]
  "
        >
          <Zap className="w-8 h-8 text-white drop-shadow" />
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Practice Check-In
        </h2>

        <p className="text-sm text-gray-300 max-w-md">
          Log your training, build consistency, and track your work over time.
        </p>

        {/* Primary actions */}
        <div className="flex gap-4 mt-4">
          <Button
            disabled={loading}
            onClick={() => {
              setShowDetails(false);
              submitCheckIn();
            }}
            className="
              px-6 py-3 text-base font-semibold rounded-xl
              bg-gray-800 text-gray-200
              hover:bg-gray-700 hover:scale-[1.02]
              transition
            "
          >
            {loading ? <Spinner size="sm" /> : "Quick Check-In"}
          </Button>

          <Button
            disabled={loading}
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
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="relative z-10 mt-8 space-y-4">
          {/* Club */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Club / Team
            </label>
            <input
              value={clubQuery}
              onChange={(e) => {
                setClubQuery(e.target.value);
                setSelectedTeam(null);
              }}
              placeholder="Start typing a club name…"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-white"
            />

            {clubResults.length > 0 && !selectedTeam && (
              <div className="absolute z-20 mt-1 w-full rounded-lg bg-gray-900 border border-gray-700 shadow-lg">
                {clubResults.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(t);
                      setClubQuery(t.teamName);
                      setClubResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800"
                  >
                    <div className="font-medium text-white">{t.teamName}</div>
                    {(t.city || t.state) && (
                      <div className="text-xs text-gray-400">
                        {[t.city, t.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discipline */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Discipline
            </label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-white"
            >
              <option value="">Select discipline…</option>
              {DISCIPLINE_OPTIONS.map((d) => (
                <option
                  key={d}
                  value={d}
                >
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 text-white"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Submit */}
          <Button
            onClick={submitCheckIn}
            disabled={loading}
            className="
              w-full mt-4 py-4 text-lg font-extrabold rounded-2xl
              bg-gradient-to-r from-ms-blue to-ms-dark-red
              text-white
              shadow-xl
              hover:scale-[1.03]
              transition
            "
          >
            {loading ? <Spinner size="sm" /> : "Check In"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AthleteCheckIn;
