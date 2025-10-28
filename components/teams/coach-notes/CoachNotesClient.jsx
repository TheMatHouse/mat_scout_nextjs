"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, ChevronRight } from "lucide-react";
import RemoveCoachEventButton from "@/components/teams/coach-notes/RemoveCoachEventButton";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function norm(s) {
  return (s ?? "").toString().toLowerCase();
}

function CoachNotesClient({ slug, events }) {
  const [scope, setScope] = useState("upcoming"); // "upcoming" | "past" | "all"
  const [q, setQ] = useState("");

  const today = startOfToday();

  const counts = useMemo(() => {
    return events.reduce(
      (acc, e) => {
        const dt = e?.startDate ? new Date(e.startDate) : null;
        const isPast = dt ? dt < today : false;
        acc.all += 1;
        if (isPast) acc.past += 1;
        else acc.upcoming += 1;
        return acc;
      },
      { upcoming: 0, past: 0, all: 0 }
    );
  }, [events, today]);

  const filtered = useMemo(() => {
    let list = events.filter((e) => {
      // scope filter
      const dt = e?.startDate ? new Date(e.startDate) : null;
      const isPast = dt ? dt < today : false;
      if (scope === "upcoming" && isPast) return false;
      if (scope === "past" && !isPast) return false;

      // search
      if (!q) return true;
      const bag = `${norm(e?.name)} ${norm(e?.location)}`;
      return bag.includes(norm(q));
    });

    // sorting
    list.sort((a, b) => {
      const da = a?.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b?.startDate ? new Date(b.startDate).getTime() : 0;
      if (scope === "past") return db - da; // most recent past first
      return da - db; // soonest upcoming first (or all)
    });

    return list;
  }, [events, scope, q, today]);

  return (
    <section className="space-y-4">
      {/* Tabs + Search (client-only) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700">
          {[
            { key: "upcoming", label: "Upcoming", count: counts.upcoming },
            { key: "past", label: "Past", count: counts.past },
            { key: "all", label: "All", count: counts.all },
          ].map((t, i) => {
            const active = scope === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setScope(t.key)}
                className={[
                  "px-3 sm:px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-white text-gray-900 hover:bg-gray-100 dark:bg-neutral-900 dark:text-gray-100 dark:hover:bg-white/10",
                  i !== 2
                    ? "border-r border-gray-300 dark:border-gray-700"
                    : "",
                ].join(" ")}
              >
                <span>{t.label}</span>
                <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] bg-gray-200/70 dark:bg-white/10">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search (no navigation) */}
        <div className="flex items-stretch gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or location…"
            className="w-full sm:w-80 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-900/60 dark:placeholder:text-gray-100/60"
          />
          <button
            type="button"
            onClick={() => setQ("")}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Events */}
      {filtered.length ? (
        <ul className="grid gap-4">
          {filtered.map((evt) => {
            const dateLabel = evt.startDate
              ? new Date(evt.startDate).toLocaleDateString()
              : "";
            const locationLabel = evt.location || "";

            return (
              <li key={evt._id}>
                <div className="group relative rounded-2xl border border-gray-300/60 dark:border-gray-700/70 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    {/* Left: title + meta */}
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {evt.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        {dateLabel ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300/70 dark:border-gray-700/70 px-2.5 py-1 text-gray-900 dark:text-gray-100">
                            <CalendarDays className="h-4 w-4" />
                            {dateLabel}
                          </span>
                        ) : null}

                        {locationLabel ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300/70 dark:border-gray-700/70 px-2.5 py-1 text-gray-900 dark:text-gray-100">
                            <MapPin className="h-4 w-4" />
                            {locationLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        href={`/teams/${slug}/coach-notes/${evt._id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                      >
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </Link>

                      <RemoveCoachEventButton
                        slug={slug}
                        eventId={evt._id}
                        cascadeChoice="ask"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* decorative hover ring */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-gray-400/0 group-hover:ring-2 group-hover:ring-gray-300/60 dark:group-hover:ring-white/10 transition" />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300/70 dark:border-gray-700/70 p-8 text-center">
          <p className="text-sm text-gray-900 dark:text-gray-100/80">
            {q
              ? "No events match your search."
              : scope === "past"
              ? "No past events."
              : scope === "upcoming"
              ? "No upcoming events."
              : "No events yet. Click “Add Event” to create your first."}
          </p>
        </div>
      )}
    </section>
  );
}

export default CoachNotesClient;
