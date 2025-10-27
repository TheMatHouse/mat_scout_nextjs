// components/teams/forms/NewCoachAthleteForm.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import CountrySelect from "@/components/shared/CountrySelect"; // ⬅️ adjust if your path/name differs

const NewCoachAthleteForm = ({ slug, eventId, onSuccess }) => {
  const router = useRouter();
  const formRef = useRef(null);

  const [mode, setMode] = useState("member"); // "member" | "guest"
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // Load team members (same pattern as scouting)
  useEffect(() => {
    if (!slug || mode !== "member") return;
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/teams/${slug}/members?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json.members) ? json.members : [];
        if (!ignore) setMembers(list);
      } catch {
        if (!ignore) setMembers([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [slug, mode]);

  // Filtered members by search query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const user = (m.username || "").toLowerCase();
      return name.includes(term) || user.includes(term);
    });
  }, [members, q]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      let body;

      if (mode === "member") {
        if (!selectedId) throw new Error("Select a team member");
        body = { athleteUserId: selectedId };
      } else {
        const fd = new FormData(e.currentTarget);
        const name = (fd.get("name") || "").toString().trim();
        const club = (fd.get("club") || "").toString().trim();
        const country = (fd.get("country") || "").toString().trim();
        if (!name) throw new Error("Athlete name is required");
        body = { athlete: { name, club, country } };
      }

      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        let msg = `Failed to add athlete (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      toast.success("Athlete added");
      formRef.current?.reset?.();
      setSelectedId("");
      setQ("");
      router.refresh();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to add athlete");
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="grid gap-3"
    >
      {/* Tabs: member vs guest */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("member")}
          className={`px-3 py-1 rounded ${
            mode === "member"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-gray-200 dark:bg-zinc-800"
          }`}
        >
          Team member
        </button>
        <button
          type="button"
          onClick={() => setMode("guest")}
          className={`px-3 py-1 rounded ${
            mode === "guest"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-gray-200 dark:bg-zinc-800"
          }`}
        >
          Guest / Non-member
        </button>
      </div>

      {mode === "member" ? (
        <div className="grid gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members by name or username"
            className="px-3 py-2 rounded border bg-transparent"
          />
          <div className="max-h-56 overflow-auto rounded border">
            {loading ? (
              <div className="p-3 text-sm opacity-80">Loading members…</div>
            ) : filtered.length ? (
              filtered.map((m) => {
                const id = String(m.familyMemberId || m.userId || "");
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 p-2 border-b last:border-b-0 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="member"
                      value={id}
                      checked={selectedId === id}
                      onChange={() => setSelectedId(id)}
                    />
                    <div className="text-sm">
                      <div className="font-medium">
                        {m.name || m.username || "Unknown"}
                      </div>
                      <div className="opacity-80">
                        {[m.club, m.country].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="p-3 text-sm opacity-80">No results</div>
            )}
          </div>

          <div className="pt-2">
            <button className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black">
              Add Athlete
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <input
            name="name"
            required
            placeholder="Athlete name"
            className="px-3 py-2 rounded border bg-transparent"
          />
          <input
            name="club"
            placeholder="Club (optional)"
            className="px-3 py-2 rounded border bg-transparent"
          />
          {/* Country drop-down (same component you use elsewhere) */}
          <CountrySelect
            name="country"
            placeholder="Country (optional)"
            className="px-3 py-2 rounded border bg-transparent"
          />
          <div className="pt-2">
            <button className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black">
              Add Athlete
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default NewCoachAthleteForm;
