"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import Spinner from "@/components/shared/Spinner";

function AthleteCheckIn({ athleteId = null }) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ---- club / team search state ----
  const [clubQuery, setClubQuery] = useState("");
  const [clubResults, setClubResults] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef(null);

  // ---- other fields ----
  const [classComponents, setClassComponents] = useState([]);
  const [visibility, setVisibility] = useState("public");

  /* -------------------------------------------------- */
  /* club search                                        */
  /* -------------------------------------------------- */
  useEffect(() => {
    const q = clubQuery.trim();

    if (q.length < 2) {
      setClubResults([]);
      setSearching(false);
      return;
    }

    // cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);

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
      })
      .finally(() => {
        setSearching(false);
      });
  }, [clubQuery]);

  /* -------------------------------------------------- */
  /* submit                                             */
  /* -------------------------------------------------- */
  async function handleCheckIn() {
    // require some notion of "where"
    if (!selectedTeam && !clubQuery.trim()) {
      toast.error("Please select or enter a club/team.");
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
          classComponents,
          visibility,
          athleteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("You're already checked in for this practice.");
          return;
        }
        throw new Error(data?.error || "Check-in failed");
      }

      toast.success("Practice logged 💪");

      // reset
      setClubQuery("");
      setSelectedTeam(null);
      setClubResults([]);
      setClassComponents([]);
      setShowDetails(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to check in.");
    } finally {
      setLoading(false);
    }
  }

  function toggleComponent(value) {
    setClassComponents((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  /* -------------------------------------------------- */
  /* render                                             */
  /* -------------------------------------------------- */
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
      <div className="flex flex-col items-center text-center gap-3">
        <CheckCircle className="w-10 h-10 text-ms-blue dark:text-ms-red" />

        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Practice Check-In
        </h3>

        <p className="text-sm text-gray-700 dark:text-gray-300">
          Log today’s training and where you trained
        </p>

        <Button
          onClick={handleCheckIn}
          disabled={loading}
          className="
            mt-2 px-6 py-4 text-base font-semibold rounded-xl
            bg-ms-blue text-white hover:bg-ms-dark-red
            dark:bg-ms-red dark:hover:bg-ms-dark-red
          "
        >
          {loading ? <Spinner size="sm" /> : "Check In"}
        </Button>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm underline text-gray-700 dark:text-gray-300 mt-2"
        >
          {showDetails ? "Hide details" : "Add details"}
        </button>
      </div>

      {showDetails && (
        <div className="mt-6 space-y-4">
          {/* Club / Team searchable input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Club / Team
            </label>

            <input
              type="text"
              value={clubQuery}
              onChange={(e) => {
                setClubQuery(e.target.value);
                setSelectedTeam(null);
              }}
              placeholder="Start typing a club or team name…"
              className="w-full border rounded p-2 bg-white dark:bg-gray-800"
            />

            {/* Suggestions */}
            {clubResults.length > 0 && !selectedTeam && (
              <div className="absolute z-20 mt-1 w-full rounded border bg-white dark:bg-gray-800 shadow">
                {clubResults.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => {
                      setSelectedTeam(t);
                      setClubQuery(t.teamName);
                      setClubResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium">{t.teamName}</div>
                    {(t.city || t.state) && (
                      <div className="text-xs text-gray-500">
                        {[t.city, t.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="text-xs text-gray-500 mt-1">Searching…</div>
            )}

            {selectedTeam && (
              <div className="text-xs text-green-600 mt-1">
                Selected existing team
              </div>
            )}
          </div>

          {/* Class components */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Class components
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                "technique",
                "randori",
                "conditioning",
                "kata",
                "drilling",
                "open",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComponent(c)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    classComponents.includes(c)
                      ? "bg-ms-blue text-white dark:bg-ms-red"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border rounded p-2 bg-white dark:bg-gray-800"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default AthleteCheckIn;
