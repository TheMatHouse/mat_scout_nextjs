// app/teams/[slug]/coach-notes/[eventId]/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import AddCoachAthleteModalButton from "@/components/teams/forms/AddCoachAthleteModalButton";
import AthleteCard from "@/components/teams/coach-notes/AthleteCard";

import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

/* -------- helpers (server) -------- */
const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
};

const getCookieHeader = async () => {
  const c = await cookies();
  const all = c.getAll();
  return all
    .map((ck) => `${ck.name}=${encodeURIComponent(ck.value)}`)
    .join("; ");
};

/* -------- data loaders (server) -------- */
const getEntries = async (slug, eventId) => {
  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${base}/api/teams/${slug}/coach-notes/events/${eventId}/entries`,
    { cache: "no-store", headers: { Cookie: cookieHeader } }
  );
  if (!res.ok) return { entries: [] };
  return res.json();
};

const getEvent = async (slug) => {
  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();
  const all = await fetch(`${base}/api/teams/${slug}/coach-notes/events`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  }).then((r) => r.json());
  return (id) => all.events?.find((e) => e._id === id);
};

const getIsManager = async (slug) => {
  await connectDB();
  const teamDoc = await Team.findOne({ teamSlug: slug })
    .select("_id user")
    .lean();
  if (!teamDoc) return false;

  const currentUser = await getCurrentUserFromCookies().catch(() => null);
  if (!currentUser?._id) return false;

  const isOwner = String(teamDoc.user) === String(currentUser._id);
  if (isOwner) return true;

  const membership = await TeamMember.findOne({
    teamId: teamDoc._id,
    userId: currentUser._id,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  const role = String(membership?.role || "").toLowerCase();
  return role === "manager" || role === "owner" || role === "admin";
};

/* -------- page (server) -------- */
const EventDetailPage = async ({ params }) => {
  const { slug, eventId } = await params;
  if (!slug || !eventId) return notFound();

  const [entriesRes, eventFinder, isManager] = await Promise.all([
    getEntries(slug, eventId),
    getEvent(slug),
    getIsManager(slug),
  ]);

  const evt = await eventFinder(eventId);
  if (!evt) return notFound();

  const entries = entriesRes.entries || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{evt.name}</h1>
          <div className="text-sm opacity-80">
            {new Date(evt.startDate).toLocaleDateString()}
            {evt.location ? ` • ${evt.location}` : ""}
          </div>
        </div>
        <Link
          href={`/teams/${slug}/coach-notes`}
          className="text-sm underline"
        >
          Back to events
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Athletes</h2>
        <AddCoachAthleteModalButton
          slug={slug}
          eventId={eventId}
        />
      </div>

      <div className="grid gap-3">
        {entries.length ? (
          entries.map((e) => (
            <AthleteCard
              key={e._id}
              slug={slug}
              entry={e}
              showDelete={isManager}
            />
          ))
        ) : (
          <div className="text-sm opacity-80">
            No athletes yet. Click “Add Athlete” to add one.
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
