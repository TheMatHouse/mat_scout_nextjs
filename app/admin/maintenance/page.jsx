// app/admin/maintenance/page.jsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";

export default function AdminMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [mode, setMode] = useState("off");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [updatingMessage, setUpdatingMessage] = useState("");

  // Fetch current status from public endpoint (always reachable)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/public/maintenance", { cache: "no-store" });
        const ct = r.headers.get("content-type") || "";
        const data = ct.includes("application/json")
          ? await r.json().catch(() => ({}))
          : {};
        if (!alive) return;
        if (!r.ok) throw new Error(data?.error || `Status ${r.status}`);

        setMode(data?.maintenanceMode || "off");
        setMaintenanceMessage(data?.maintenanceMessage || "");
        setUpdatingMessage(
          data?.updatingMessage ||
            "We're deploying updates to the site. We will be back very shortly."
        );
        setError("");
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load current maintenance status.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const banner = useMemo(() => {
    if (mode === "off") return null;
    const label = mode === "updating" ? "UPDATING" : "MAINTENANCE";
    return (
      <div className="mb-4 rounded-lg border px-4 py-3 bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-100">
        <div className="font-semibold">Site is currently: {label}</div>
        <div className="text-sm opacity-90">
          You can still change it here. If a save is blocked, use “Bypass &
          retry”.
        </div>
      </div>
    );
  }, [mode]);

  async function save(nextMode) {
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode: nextMode ?? mode,
          maintenanceMessage,
          updatingMessage,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : {};

      if (!res.ok || data?.ok === false) {
        // 403 likely means you’re not authenticated as admin or middleware blocked.
        // Show helpful hint + keep values intact.
        if (res.status === 403) {
          throw new Error(
            "Forbidden. Make sure you’re logged in as an admin. If the site is in maintenance/updating, click “Bypass & retry”."
          );
        }
        throw new Error(data?.error || `Request failed: ${res.status}`);
      }

      setMode(data?.maintenanceMode || "off");
      if (typeof data?.maintenanceMessage === "string") {
        setMaintenanceMessage(data.maintenanceMessage);
      }
      if (typeof data?.updatingMessage === "string") {
        setUpdatingMessage(data.updatingMessage);
      }
      setOkMsg("Saved.");
    } catch (err) {
      setError(err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function bypassAndRetry() {
    // Sets the bypass cookie then returns to this page without the query string.
    const url = new URL(window.location.href);
    url.searchParams.set("bypass_maintenance", "1");
    window.location.href = url.toString();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Maintenance Mode</h1>

      {banner}

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border px-4 py-3 bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-100">
              {error}
              {mode !== "off" && (
                <div className="mt-2">
                  <button
                    onClick={bypassAndRetry}
                    className="inline-flex items-center px-3 py-1.5 rounded-md border border-yellow-300 text-yellow-900 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-100 dark:bg-yellow-900/30 dark:border-yellow-700"
                  >
                    Bypass & retry
                  </button>
                </div>
              )}
            </div>
          )}

          {okMsg && (
            <div className="mb-4 rounded-lg border px-4 py-3 bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-100">
              {okMsg}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <div className="font-medium mb-2">Mode</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="off"
                    checked={mode === "off"}
                    onChange={() => setMode("off")}
                  />
                  <span>Off</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="maintenance"
                    checked={mode === "maintenance"}
                    onChange={() => setMode("maintenance")}
                  />
                  <span>Maintenance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="updating"
                    checked={mode === "updating"}
                    onChange={() => setMode("updating")}
                  />
                  <span>Updating</span>
                </label>
              </div>
            </div>

            <div>
              <div className="font-medium mb-2">Maintenance message</div>
              <textarea
                className="w-full min-h-[90px] rounded-md border px-3 py-2 bg-white/70 dark:bg-black/20"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Optional message shown during Maintenance."
              />
            </div>

            <div>
              <div className="font-medium mb-2">Updating message</div>
              <textarea
                className="w-full min-h-[90px] rounded-md border px-3 py-2 bg-white/70 dark:bg-black/20"
                value={updatingMessage}
                onChange={(e) => setUpdatingMessage(e.target.value)}
                placeholder="Message shown during Updating (brief deploys)."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => save()}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>

              {mode !== "off" && (
                <button
                  onClick={() => save("off")}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  Turn Off Now
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
