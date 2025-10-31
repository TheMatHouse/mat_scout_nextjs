export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import AddCoachEventModalButton from "@/components/teams/coach-notes/forms/AddCoachEventModalButton";
import CoachNotesClient from "@/components/teams/coach-notes/CoachNotesClient";

/* -------------------- helpers (server) -------------------- */
async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function getCookieHeader() {
  const c = await cookies();
  return c
    .getAll()
    .map((ck) => `${ck.name}=${encodeURIComponent(ck.value)}`)
    .join("; ");
}

/* -------------------- data loaders (server) -------------------- */
async function getEvents(slug) {
  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${base}/api/teams/${slug}/coach-notes/events`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });
  if (!res.ok) return { events: [] };
  return res.json();
}

/* -------------------- page (server) -------------------- */
async function CoachNotesPage({ params }) {
  const { slug } = await params; // Next.js 15 awaited-params pattern
  if (!slug) return notFound();

  const { events } = await getEvents(slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            Coach’s Notes
          </h1>
          <p className="text-sm text-gray-900/80 dark:text-gray-100/80">
            Create events, add athletes, and track match notes.
          </p>
        </div>
        <AddCoachEventModalButton slug={slug} />
      </div>

      {/* Client-side filters & list (instant, no page reload) */}
      <CoachNotesClient
        slug={slug}
        events={Array.isArray(events) ? events : []}
      />
    </div>
  );
}

export default CoachNotesPage;
