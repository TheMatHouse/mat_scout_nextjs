// app/teams/[slug]/coach-notes/[eventId]/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";

import AddCoachAthleteModalButton from "@/components/teams/coach-notes/forms/AddCoachAthleteModalButton";
import AddCoachMatchModalButton from "@/components/teams/coach-notes/forms/AddCoachMatchModalButton";
import NoteRowActions from "@/components/teams/coach-notes/NoteRowActions";
import RemoveEntryButton from "@/components/teams/coach-notes/RemoveEntryButton";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";

import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";

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
  const encrypted = n?.crypto?.ciphertextB64 ? true : false;

  // If encrypted → DO NOT ATTEMPT TO READ PLAINTEXT FIELDS
  if (encrypted) {
    return {
      _id: toStr(n?._id),
      encrypted: true,
      crypto: n.crypto,
      opponent: n.opponent || {},
      video: n.video || n.videoRaw || {},
      createdAt: n?.createdAt ? new Date(n.createdAt).toISOString() : "",
      updatedAt: n?.updatedAt ? new Date(n.updatedAt).toISOString() : "",

      // blank placeholders - client will replace after decrypt
      result: "",
      score: "",
      whatWentWell: "",
      reinforce: "",
      needsFix: "",
      notes: "",
      techniques: { ours: [], theirs: [] },
    };
  }

  // Legacy plaintext note
  const opp = n?.opponent || {};
  const tech = n?.techniques || {};
  return {
    _id: toStr(n?._id),
    encrypted: false,
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

/* ---------------- role + family ---------------- */
const getUserRoleAndFamily = async (slug) => {
  await connectDB();

  const user = await getCurrentUserFromCookies().catch(() => null);
  if (!user) return { role: "none", user: null, familyIds: [] };

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team) return { role: "none", user, familyIds: [] };

  const isOwner = team.user && String(team.user) === String(user._id);
  if (isOwner) {
    return { role: "manager", user, familyIds: [] };
  }

  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId: user._id,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  let role = membership?.role ? membership.role.toLowerCase() : "none";

  // load user's kids
  const familyMembers = await FamilyMember.find({ userId: user._id })
    .select("_id")
    .lean();

  const familyIds = familyMembers.map((f) => String(f._id));

  return { role, user, familyIds };
};

/* ---------------- data loaders ---------------- */
const getTeam = async (slug) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();

    const res = await fetch(`${base}/api/teams/${slug}`, {
      cache: "no-store",
      headers: { cookie },
    });

    if (!res.ok) return null;
    const data = await safeJson(res);
    return data?.team || null;
  } catch {
    return null;
  }
};

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
const MatchList = async ({ slug, eventId, entry, team }) => {
  const { notes, _error } = await getMatches(slug, eventId, entry._id);

  const sorted = Array.isArray(notes)
    ? [...notes].sort((a, b) => {
        const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
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
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg:white/5"
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
                team={team}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AthleteCard = async ({ slug, eventId, entry, team }) => {
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
            {[entry.athlete?.club].filter(Boolean).join(" • ")}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <AddCoachMatchModalButton
            slug={slug}
            eventId={eventId}
            entryId={entry._id}
          />
          <RemoveEntryButton
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
        team={team}
      />
    </section>
  );
};

/* ---------------- page ---------------- */
const EventDetailPage = async ({ params }) => {
  const { slug, eventId } = await params;
  if (!slug || !eventId) return notFound();

  const [evt, entriesRes, team] = await Promise.all([
    getEventMeta(slug, eventId),
    getEntries(slug, eventId),
    getTeam(slug),
  ]);

  if (!evt) return notFound();

  const { role, user, familyIds } = await getUserRoleAndFamily(slug);
  const isManagerOrCoach = role === "manager" || role === "coach";

  const allEntries = Array.isArray(entriesRes?.entries)
    ? entriesRes.entries
    : [];

  const loadErr = entriesRes?._error;

  let visibleEntries = allEntries;

  if (!isManagerOrCoach) {
    const userId = String(user?._id);
    visibleEntries = allEntries.filter((e) => {
      const a = e.athlete || {};
      const isSelf = a.user && String(a.user) === userId;
      const isChild =
        a.familyMember && familyIds.includes(String(a.familyMember));
      return isSelf || isChild;
    });
  }

  return (
    <TeamUnlockGate slug={slug}>
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {evt.name}
            </h1>
            <div className="text-sm text-gray-900 dark:text-gray-100/80">
              {evt.startDate
                ? new Date(evt.startDate).toLocaleDateString()
                : ""}
              {evt.location ? ` • ${evt.location}` : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AddCoachAthleteModalButton
              slug={slug}
              eventId={eventId}
            />

            <Link
              href={`/teams/${slug}/coach-notes`}
              className="text-sm underline text-gray-900 dark:text-gray-100"
            >
              Back to events
            </Link>
          </div>
        </div>

        {loadErr ? (
          <div className="text-sm text-red-600">
            Failed to load athletes: {loadErr}
          </div>
        ) : null}

        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Athletes
          </h3>

          {visibleEntries.length ? (
            <div className="grid gap-4">
              {visibleEntries.map((e) => (
                <AthleteCard
                  key={String(e?._id)}
                  slug={slug}
                  eventId={eventId}
                  entry={e}
                  team={team}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-900 dark:text-gray-100/80">
              No athletes yet for this event.
            </div>
          )}
        </div>
      </div>
    </TeamUnlockGate>
  );
};

export default EventDetailPage;
