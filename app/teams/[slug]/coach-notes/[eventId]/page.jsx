// app/teams/[slug]/coach-notes/[eventId]/page.jsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";

import TeamUnlockGate from "@/components/teams/TeamUnlockGate";
import CoachEventClient from "@/components/teams/coach-notes/CoachEventClient";

import { getCurrentUserFromCookies } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

/* -------------------- helpers (server) -------------------- */

const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
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

const getEvent = async (slug, eventId) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();

    const res = await fetch(
      `${base}/api/teams/${encodeURIComponent(
        slug
      )}/coach-notes/events/${eventId}`,
      {
        cache: "no-store",
        headers: { cookie },
      }
    );

    if (!res.ok) return null;
    return await safeJson(res);
  } catch {
    return null;
  }
};

/* -------------------- page (server) -------------------- */

const CoachEventPage = async ({ params }) => {
  const { slug, eventId } = await params;
  if (!slug || !eventId) return notFound();

  const user = await getCurrentUserFromCookies().catch(() => null);

  let role = null;

  if (user?._id) {
    const gate = await requireTeamRole(user._id, slug, [
      "manager",
      "coach",
      "member",
    ]);

    if (gate.ok) role = gate.role;
  }

  const eventData = await getEvent(slug, eventId);

  if (!eventData || !eventData.event) return notFound();

  return (
    <TeamUnlockGate slug={slug}>
      <CoachEventClient
        slug={slug}
        eventId={eventId}
        event={eventData.event}
        role={role}
      />
    </TeamUnlockGate>
  );
};

export default CoachEventPage;
