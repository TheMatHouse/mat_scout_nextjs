"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/shared/Spinner";

export default function FamilyCoachNotes({ member }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const memberId = String(member?._id || member?.id);

  useEffect(() => {
    if (!memberId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dashboard/family/${memberId}/coach-notes`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const json = await res.json().catch(() => null);
        setEvents(json?.events || []);
      } catch (e) {
        console.error("Failed to load family coach notes", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size={48} />
      </div>
    );
  }

  if (!events.length) {
    return (
      <p className="text-sm text-gray-900 dark:text-gray-100/80">
        No coach's notes available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((evt) => (
        <section
          key={evt._id}
          className="border rounded-xl p-4 bg-white dark:bg-neutral-900"
        >
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {evt.name}
          </h3>
          <div className="text-sm text-gray-900 dark:text-gray-100/80 mb-3">
            {evt.date || ""}
          </div>

          {evt.matches?.length ? (
            <ul className="space-y-2">
              {evt.matches.map((m) => (
                <li
                  key={m._id}
                  className="border rounded-lg p-3 bg-gray-50 dark:bg-neutral-800"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Opponent: {m.opponent?.name || "Opponent"}
                  </div>
                  <div className="text-xs text-gray-900 dark:text-gray-100/80">
                    {m.result ? `Result: ${m.result}` : ""}
                    {m.score ? ` • Score: ${m.score}` : ""}
                  </div>
                  {m.notes ? (
                    <div className="mt-2 text-sm text-gray-900 dark:text-gray-100/90 whitespace-pre-line">
                      {m.notes}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-900 dark:text-gray-100/60">
              No match notes.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
