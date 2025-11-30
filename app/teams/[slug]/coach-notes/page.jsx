// app/teams/[slug]/coach-notes/page.jsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";

import AddCoachEventModalButton from "@/components/teams/coach-notes/forms/AddCoachEventModalButton";
import CoachNotesClient from "@/components/teams/coach-notes/CoachNotesClient";
import TeamUnlockGate from "@/components/teams/TeamUnlockGate";

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

const getEvents = async (slug) => {
  try {
    const base = await getBaseUrl();
    const cookie = await getCookieHeader();

    const res = await fetch(
      `${base}/api/teams/${encodeURIComponent(slug)}/coach-notes/events`,
      {
        cache: "no-store",
        headers: { cookie },
      }
    );

    if (!res.ok) return { events: [] };
    const data = await safeJson(res);
    return data || { events: [] };
  } catch {
    return { events: [] };
  }
};

/* -------------------- page (server) -------------------- */

const CoachNotesPage = async ({ params }) => {
  const { slug } = await params; // Next.js 15 awaited-params pattern
  if (!slug) return notFound();

  // ----- figure out role so we can hide/show Add button -----
  const user = await getCurrentUserFromCookies().catch(() => null);

  let isManagerOrCoach = false;

  if (user?._id) {
    const gate = await requireTeamRole(user._id, slug, [
      "manager",
      "coach",
      "member",
    ]);

    if (gate.ok && (gate.role === "manager" || gate.role === "coach")) {
      isManagerOrCoach = true;
    }
  }

  const { events } = await getEvents(slug);

  return (
    <TeamUnlockGate slug={slug}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Coach&apos;s Notes
            </h1>
            <p className="text-sm text-gray-900 dark:text-gray-100/80">
              Track notes by event and athlete.
            </p>
          </div>

          {isManagerOrCoach ? <AddCoachEventModalButton slug={slug} /> : null}
        </div>

        {/* Events + client UI */}
        <CoachNotesClient
          slug={slug}
          events={events || []}
          isManagerOrCoach={isManagerOrCoach}
        />
      </div>
    </TeamUnlockGate>
  );
};

export default CoachNotesPage;
