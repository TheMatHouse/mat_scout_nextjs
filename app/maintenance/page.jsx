// app/maintenance/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MaintenancePage() {
  const router = useRouter();
  const search = useSearchParams();
  const reason = search.get("reason") || "maintenance";

  const [mode, setMode] = useState(
    reason === "updating" ? "updating" : "maintenance"
  );
  const [message, setMessage] = useState(
    reason === "updating"
      ? "We're deploying updates to the site. We will be back very shortly."
      : "We’re performing maintenance. Please check back soon."
  );
  const [checking, setChecking] = useState(false);

  async function refreshStatus() {
    try {
      setChecking(true);
      const r = await fetch("/api/public/maintenance", { cache: "no-store" });
      const ct = r.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await r.json().catch(() => ({}))
        : {};

      // If the site is back, leave immediately
      if (data?.maintenanceMode === "off") {
        router.replace("/"); // land users on home (you can change this if you prefer)
        return;
      }

      // Stay on this page and update copy
      if (data?.maintenanceMode === "updating") {
        setMode("updating");
        setMessage(
          data?.updatingMessage ||
            "We're deploying updates to the site. We will be back very shortly."
        );
      } else {
        setMode("maintenance");
        setMessage(
          data?.maintenanceMessage ||
            "We’re performing maintenance. Please check back soon."
        );
      }
    } catch {
      // ignore errors, user can try again
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let alive = true;

    // initial check
    (async () => {
      if (!alive) return;
      await refreshStatus();
    })();

    // poll every 5s
    const id = setInterval(() => {
      if (!alive) return;
      refreshStatus();
    }, 5000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold mb-3">
        {mode === "updating"
          ? "We’re updating MatScout"
          : "MatScout is under maintenance"}
      </h1>
      <p className="text-base opacity-90">{message}</p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          onClick={refreshStatus}
          disabled={checking}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {checking ? "Checking…" : "Try again"}
        </button>
      </div>

      <p className="mt-6 text-sm opacity-70">
        This page will automatically leave when the site is back online.
      </p>
    </main>
  );
}
