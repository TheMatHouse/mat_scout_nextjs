// components/teams/forms/NewCoachAthleteForm.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-toastify";
import CountrySelect from "@/components/shared/CountrySelect";

const NewCoachAthleteForm = ({ slug, eventId, onSuccess }) => {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef(null);

  const [mode, setMode] = useState("member"); // "member" | "guest"
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]); // [{ userId? , familyMemberId? }]
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // load eligible list
  useEffect(() => {
    if (!slug || mode !== "member") return;
    let ignore = false;

    (async () => {
      try {
        setLoading(true);

        // server excludes already-added
        const res = await fetch(
          `/api/teams/${slug}/coach-notes/eligible-members?excludeEvent=${encodeURIComponent(
            eventId
          )}&ts=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        let list = Array.isArray(json.members) ? json.members : [];

        // client safety: exclude current entries in case of stale data
        try {
          const re = await fetch(
            `/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
            { cache: "no-store" }
          );
          if (re.ok) {
            const ej = await re.json().catch(() => ({}));
            const users = new Set(
              (ej.entries || [])
                .map((e) => String(e?.athlete?.user || ""))
                .filter(Boolean)
            );
            const fams = new Set(
              (ej.entries || [])
                .map((e) => String(e?.athlete?.familyMember || ""))
                .filter(Boolean)
            );
            list = list.filter((m) => {
              const u = String(m.userId || "");
              const f = String(m.familyMemberId || "");
              return !(users.has(u) || fams.has(f));
            });
          }
        } catch {}

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
  }, [slug, eventId, mode]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const user = (m.username || "").toLowerCase();
      return name.includes(term) || user.includes(term);
    });
  }, [members, q]);

  // selection helpers
  const keyOf = (m) => (m.userId ? `u:${m.userId}` : `f:${m.familyMemberId}`);
  const isChecked = (m) =>
    selected.some((s) =>
      m.userId ? s.userId === m.userId : s.familyMemberId === m.familyMemberId
    );
  const toggle = (m) => {
    setSelected((prev) => {
      const exists = prev.some((s) =>
        m.userId ? s.userId === m.userId : s.familyMemberId === m.familyMemberId
      );
      if (exists) {
        return prev.filter((s) =>
          m.userId
            ? s.userId !== m.userId
            : s.familyMemberId !== m.familyMemberId
        );
      }
      return [
        ...prev,
        m.userId ? { userId: m.userId } : { familyMemberId: m.familyMemberId },
      ];
    });
  };
  const selectAll = () =>
    setSelected(
      filtered.map((m) =>
        m.userId ? { userId: m.userId } : { familyMemberId: m.familyMemberId }
      )
    );
  const clearAll = () => setSelected([]);

  // central success handler: close modal, refresh UI
  const finishSuccess = (message = "Athlete(s) added") => {
    toast.success(message);
    formRef.current?.reset?.();
    setSelected([]);
    setQ("");
    // close modal first
    try {
      onSuccess?.();
    } catch {}
    // bump RSC fetch right after close
    setTimeout(() => {
      // router.refresh() is sync; forcing same path push ensures re-render in some edge cases
      try {
        router.refresh();
      } catch {}
      try {
        router.push(pathname);
      } catch {}
    }, 0);
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      if (mode === "member") {
        if (!selected.length) throw new Error("Select at least one member");

        // try bulk
        let usedBulk = false;
        try {
          const bulkRes = await fetch(
            `/api/teams/${slug}/coach-notes/events/${eventId}/entries/bulk`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: selected }),
            }
          );
          if (bulkRes.ok) {
            usedBulk = true;
            const data = await bulkRes.json().catch(() => ({}));
            const created = Number(data?.createdCount || 0);
            const skipped = Array.isArray(data?.skipped) ? data.skipped : [];

            if (created > 0)
              finishSuccess(
                `Added ${created} ${created === 1 ? "athlete" : "athletes"}`
              );
            if (skipped.length) {
              const msg = skipped
                .slice(0, 5)
                .map(
                  (s) =>
                    `${s.userId || s.familyMemberId || "?"}: ${
                      s.reason || "skipped"
                    }`
                )
                .join("\n");
              toast.error(`Some were skipped:\n${msg}`);
            }
            return; // we already closed & refreshed
          }
        } catch {}

        // fallback: one by one
        const results = [];
        for (const it of selected) {
          const res = await fetch(
            `/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                it.userId
                  ? { athleteUserId: it.userId }
                  : { athleteFamilyMemberId: it.familyMemberId }
              ),
            }
          );
          let detail = null;
          try {
            detail = await res.json();
          } catch {}
          results.push({ ok: res.ok, status: res.status, detail, it });
        }

        const okCount = results.filter((r) => r.ok).length;
        const bad = results.filter((r) => !r.ok);

        if (okCount > 0)
          finishSuccess(
            `Added ${okCount} ${okCount === 1 ? "athlete" : "athletes"}`
          );
        if (bad.length) {
          const msg = bad
            .slice(0, 5)
            .map((b) => {
              const id = b.it.userId || b.it.familyMemberId || "?";
              const reason = b.detail?.error || `HTTP ${b.status}`;
              return `${id}: ${reason}`;
            })
            .join("\n");
          toast.error(`Some were skipped:\n${msg}`);
        }
        return;
      }

      // guest / non-member
      const fd = new FormData(e.currentTarget);
      const name = (fd.get("name") || "").toString().trim();
      const club = (fd.get("club") || "").toString().trim();
      const country = (fd.get("country") || "").toString().trim(); // safe to keep (schema ignores if removed)
      if (!name) throw new Error("Athlete name is required");

      const res = await fetch(
        `/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athlete: { name, club, country } }),
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

      finishSuccess("Athlete added");
    } catch (err) {
      toast.error(err?.message || "Failed to add athlete(s)");
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="grid gap-3"
    >
      {/* Tabs */}
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
          Team member(s)
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
          {/* Search + bulk controls */}
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members by name or username"
              className="px-3 py-2 rounded border bg-transparent flex-1"
            />
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-2 rounded border"
              disabled={!filtered.length}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 rounded border"
              disabled={!selected.length}
            >
              Clear
            </button>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-auto rounded border">
            {loading ? (
              <div className="p-3 text-sm opacity-80">Loading members…</div>
            ) : filtered.length ? (
              filtered.map((m) => (
                <label
                  key={keyOf(m)}
                  className="flex items-center gap-3 p-2 border-b last:border-b-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={isChecked(m)}
                    onChange={() => toggle(m)}
                  />
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-zinc-700" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {m.name || m.username || "Unknown"}
                      {m.role ? (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          ({m.role})
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300/80 truncate">
                      {m.username || ""}
                    </div>
                  </div>
                </label>
              ))
            ) : (
              <div className="p-3 text-sm opacity-80">No results</div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl shadow bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
              disabled={selected.length === 0}
            >
              {selected.length > 0
                ? `Add ${selected.length} selected`
                : "Add to Event"}
            </button>
          </div>
        </div>
      ) : (
        // Guest / Non-member
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
