// app/teams/[slug]/coach-notes/[eventId]/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";

import AddCoachMatchModalButton from "@/components/teams/coach-notes/forms/AddCoachMatchModalButton";
import NoteRowActions from "@/components/teams/coach-notes/NoteRowActions";

/* ✅ Add Athlete modal trigger */
import AddCoachAthleteModalButton from "@/components/teams/coach-notes/forms/AddCoachAthleteModalButton";

/* ---------------- helpers ---------------- */
const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host && host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
};

const getCookieHeader = async () => {
  const all = (await cookies()).getAll();
  return all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
};

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const toStr = (v) => (v == null ? "" : String(v));
const serializeNote = (n = {}) => {
  const opp = n?.opponent || {};
  const tech = n?.techniques || {};
  return {
    _id: toStr(n?._id),
    opponent: {
      firstName: toStr(opp?.firstName),
      lastName: toStr(opp?.lastName),
      name: toStr(opp?.name),
      rank: toStr(opp?.rank),
      club: toStr(opp?.club),
      country: toStr(opp?.country),
    },
    result: toStr(n?.result),
    score: toStr(n?.score),
    whatWentWell: toStr(n?.whatWentWell),
    reinforce: toStr(n?.reinforce),
    needsFix: toStr(n?.needsFix),
    notes: toStr(n?.notes),
    techniques: {
      ours: Array.isArray(tech?.ours) ? tech.ours.map(toStr) : [],
      theirs: Array.isArray(tech?.theirs) ? tech.theirs.map(toStr) : [],
    },
    createdAt: n?.createdAt ? new Date(n.createdAt).toISOString() : "",
    updatedAt: n?.updatedAt ? new Date(n.updatedAt).toISOString() : "",
  };
};

/* ---------------- data loaders ---------------- */
const getEntries = async (slug, eventId) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();
    const res = await fetch(
      `${base}/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
      { cache: "no-store", headers: { cookie } }
    );
    if (!res.ok) return { entries: [], _error: `entries ${res.status}` };
    const data = await safeJson(res);
    return data || { entries: [] };
  } catch (e) {
    return { entries: [], _error: e?.message || "entries load failed" };
  }
};

const getEventMeta = async (slug, eventId) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();
    const res = await fetch(`${base}/api/teams/${slug}/coach-notes/events`, {
      cache: "no-store",
      headers: { cookie },
    });
    if (!res.ok) return null;
    const data = await safeJson(res);
    const evt =
      Array.isArray(data?.events) &&
      data.events.find((e) => String(e?._id) === String(eventId));
    return evt || null;
  } catch {
    return null;
  }
};

const getMatches = async (slug, eventId, entryId) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();
    const res = await fetch(
      `${base}/api/teams/${slug}/coach-notes/events/${eventId}/entries/${entryId}/matches`,
      { cache: "no-store", headers: { cookie } }
    );
    if (!res.ok) return { notes: [], _error: `matches ${res.status}` };
    const data = await safeJson(res);
    return data || { notes: [] };
  } catch (e) {
    return { notes: [], _error: e?.message || "matches load failed" };
  }
};

/* ---------------- subcomponents (server) ---------------- */
const MatchList = async ({ slug, eventId, entry }) => {
  const { notes, _error } = await getMatches(slug, eventId, entry._id);

  const sorted = Array.isArray(notes)
    ? [...notes].sort((a, b) => {
        const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db; // entered order
      })
    : [];

  if (_error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load matches: {_error}
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="text-sm text-gray-900 dark:text-gray-100 opacity-80">
        No notes yet.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border">
      {sorted.map((raw, idx) => {
        const n = serializeNote(raw);

        const oppName =
          (n.opponent.firstName || n.opponent.lastName
            ? `${n.opponent.firstName} ${n.opponent.lastName}`.trim()
            : n.opponent.name) || "Opponent";

        return (
          <div
            key={n._id || idx}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {idx + 1}. {oppName}
              </div>
              <div className="text-xs text-gray-900 dark:text-gray-100/80">
                {n.result ? String(n.result).toUpperCase() : ""}
                {n.result && n.score ? " • " : ""}
                {n.score || ""}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <NoteRowActions
                slug={slug}
                eventId={eventId}
                entryId={entry._id}
                matchId={n._id}
                initialMatch={n}
                athleteName={
                  entry?.athlete
                    ? `${entry.athlete.firstName || ""} ${
                        entry.athlete.lastName || ""
                      }`.trim()
                    : "Athlete"
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AthleteCard = async ({ slug, eventId, entry }) => {
  return (
    <section
      id={`entry-${entry._id}`}
      className="rounded-2xl border p-4 space-y-3 bg-white dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
            {entry.athlete?.name}
          </div>
          <div className="text-sm text-gray-900 dark:text-gray-100/80">
            {[entry.athlete?.club, entry.athlete?.country]
              .filter(Boolean)
              .join(" • ")}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* Add Note (match) for this athlete */}
          <AddCoachMatchModalButton
            slug={slug}
            eventId={eventId}
            entryId={entry._id}
          />
        </div>
      </div>

      <MatchList
        slug={slug}
        eventId={eventId}
        entry={entry}
      />
    </section>
  );
};

/* ---------------- page ---------------- */
const EventDetailPage = async ({ params }) => {
  const { slug, eventId } = await params; // Next.js 15 awaited-params pattern
  if (!slug || !eventId) return notFound();

  const [evt, entriesRes] = await Promise.all([
    getEventMeta(slug, eventId),
    getEntries(slug, eventId),
  ]);

  if (!evt) return notFound();

  const entries = Array.isArray(entriesRes?.entries) ? entriesRes.entries : [];
  const loadErr = entriesRes?._error;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {evt.name}
          </h1>
          <div className="text-sm text-gray-900 dark:text-gray-100/80">
            {evt.startDate ? new Date(evt.startDate).toLocaleDateString() : ""}
            {evt.location ? ` • ${evt.location}` : ""}
          </div>
        </div>
        <Link
          href={`/teams/${slug}/coach-notes`}
          className="text-sm underline text-gray-900 dark:text-gray-100"
        >
          Back to events
        </Link>
      </div>

      {loadErr ? (
        <div className="text-sm text-red-600">
          Failed to load athletes: {loadErr}
        </div>
      ) : null}

      {/* Header for Athletes + Add Athlete button */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Athletes
        </h3>

        {/* ✅ Add Athlete to this event */}
        <AddCoachAthleteModalButton
          slug={slug}
          eventId={eventId}
        />
      </div>

      {/* List or empty state */}
      {entries.length ? (
        <div className="grid gap-4">
          {entries.map((e) => (
            <AthleteCard
              key={String(e?._id)}
              slug={slug}
              eventId={eventId}
              entry={e}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border p-6 bg-white dark:bg-neutral-900">
          <div className="text-sm text-gray-900 dark:text-gray-100/80 mb-3">
            No athletes yet for this event.
          </div>
          <AddCoachEntryModalButton
            slug={slug}
            eventId={eventId}
          />
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;
