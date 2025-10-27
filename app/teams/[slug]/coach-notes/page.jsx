// app/teams/[slug]/coach-notes/page.jsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import AddCoachEventModalButton from "@/components/teams/coach-notes/forms/AddCoachEventModalButton";

/* -------- helpers (server) -------- */
const getBaseUrl = async () => {
  const h = await headers(); // ⬅️ await dynamic API
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
};

const getCookieHeader = async () => {
  const c = await cookies(); // ⬅️ await dynamic API
  const all = c.getAll();
  return all
    .map((ck) => `${ck.name}=${encodeURIComponent(ck.value)}`)
    .join("; ");
};

/* -------- data loaders (server) -------- */
const getEvents = async (slug) => {
  const base = await getBaseUrl();
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${base}/api/teams/${slug}/coach-notes/events`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader }, // ensure SSR sees the session
  });
  if (!res.ok) return { events: [] };
  return res.json();
};

/* -------- page (server) -------- */
const CoachNotesPage = async ({ params }) => {
  const { slug } = await params; // Next.js 15 awaited-params pattern
  if (!slug) return notFound();

  const { events } = await getEvents(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coach’s Notes</h1>
        {/* Modal trigger button (client) */}
        <AddCoachEventModalButton slug={slug} />
      </div>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Events</h2>
        <div className="grid gap-3">
          {events?.length ? (
            events.map((evt) => (
              <Link
                key={evt._id}
                href={`/teams/${slug}/coach-notes/${evt._id}`}
                className="block rounded-2xl border p-4 hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">{evt.name}</div>
                    <div className="text-sm opacity-80">
                      {new Date(evt.startDate).toLocaleDateString()}{" "}
                      {evt.location ? `• ${evt.location}` : ""}
                    </div>
                  </div>
                  <div className="text-sm underline">Open</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-sm opacity-80">
              No events yet. Click “Add Event” to create your first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachNotesPage;
