"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function BackupClient({ serverSaveEnabled }) {
  const [loading, setLoading] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(false);

  const download = () => {
    const qs = includeSensitive ? "?includeSensitive=true" : "";
    const url = `/api/admin/backup/download${qs}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const saveToServer = async () => {
    setLoading(true);
    try {
      const qs = includeSensitive ? "?includeSensitive=true" : "";
      const res = await fetch(`/api/admin/backup/save${qs}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Save failed");
        return;
      }
      toast.success(`Saved backup (${data.bytes} bytes) to: ${data.path}`);
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border p-4 bg-white dark:bg-gray-900 space-y-4">
      <div className="flex items-center gap-3">
        <input
          id="sens"
          type="checkbox"
          className="h-4 w-4"
          checked={includeSensitive}
          onChange={() => setIncludeSensitive((v) => !v)}
        />
        <label
          htmlFor="sens"
          className="text-sm"
        >
          Include sensitive fields (e.g., password hashes). Only enable for full
          recovery archives you will store securely.
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={download}
          className="px-4 py-2 rounded bg-[var(--ms-light-red)] text-white"
        >
          Download .json.gz
        </button>

        <button
          onClick={saveToServer}
          disabled={!serverSaveEnabled || loading}
          className={[
            "px-4 py-2 rounded border",
            !serverSaveEnabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
          title={
            serverSaveEnabled
              ? "Write gzipped JSON to the server folder (BACKUP_DIR)"
              : "Set BACKUP_DIR in your environment to enable"
          }
        >
          {loading ? "Saving…" : "Save to server folder"}
        </button>
      </div>

      {!serverSaveEnabled && (
        <p className="text-xs text-gray-500">
          To enable server saves, set <code>BACKUP_DIR</code> to a writable path
          (e.g., <code>/var/backups/matscout</code>) on a persistent server.
          Serverless hosts typically can’t persist files between requests.
        </p>
      )}

      <div className="text-xs text-gray-500">
        Collections included: users, teams, familyMembers, teamMembers (if
        present), matchReports, scoutingReports, contactThreads, userStyles,
        notifications, teamUpdates, techniques, videos.
      </div>
    </div>
  );
}
