"use client";

import { useState } from "react";
import { toast } from "react-toastify";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(1)} ${u[i]}`;
}

export default function BackupClient({ serverSaveEnabled }) {
  const [loading, setLoading] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [pruning, setPruning] = useState(false);

  const download = () => {
    const qs = includeSensitive ? "?includeSensitive=true" : "";
    const a = document.createElement("a");
    a.href = `/api/admin/backup/download${qs}`;
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
      const size = data.bytes ? fmtBytes(data.bytes) : "unknown size";
      const sha = data.sha256 ? `\nsha256: ${data.sha256}` : "";
      toast.success(
        `${
          data.encrypted ? "Saved ENCRYPTED backup" : "Saved backup"
        } (${size})\n${data.path}${sha}`
      );
    } catch (e) {
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const pruneOld = async () => {
    const input = prompt(
      "Prune backups older than how many days? (default 30)",
      "30"
    );
    if (input === null) return;
    const days = Math.max(1, parseInt(input, 10) || 30);

    setPruning(true);
    try {
      const res1 = await fetch(
        `/api/admin/backup/prune?days=${days}&dryRun=true`,
        { method: "POST" }
      );
      const data1 = await res1.json().catch(() => ({}));
      if (!res1.ok || data1?.error)
        return toast.error(data1?.error || "Dry run failed");

      const totalBytes = (data1.deleted || []).reduce(
        (s, d) => s + (d.bytes || 0),
        0
      );
      if (
        !confirm(
          `${data1.deletedCount} file(s) would be deleted (${fmtBytes(
            totalBytes
          )}). Continue?`
        )
      ) {
        toast.info("Prune canceled.");
        return;
      }

      const res2 = await fetch(`/api/admin/backup/prune?days=${days}`, {
        method: "POST",
      });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok || data2?.error)
        return toast.error(data2?.error || "Prune failed");

      const totalBytes2 = (data2.deleted || []).reduce(
        (s, d) => s + (d.bytes || 0),
        0
      );
      toast.success(
        `Pruned ${data2.deletedCount} file(s), freed ${fmtBytes(totalBytes2)}.`
      );
    } catch (e) {
      toast.error(e?.message || "Prune failed");
    } finally {
      setPruning(false);
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
          Include sensitive fields (password hashes). Only for secure archives.
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
              ? "Write backup to BACKUP_DIR"
              : "Set BACKUP_DIR to enable"
          }
        >
          {loading ? "Saving…" : "Save to server folder"}
        </button>

        <button
          onClick={pruneOld}
          disabled={pruning}
          className="px-4 py-2 rounded border"
        >
          {pruning ? "Pruning…" : "Prune old backups"}
        </button>
      </div>

      <div className="text-xs text-gray-500">
        Server saves now create a <code>.sha256</code> file. Set{" "}
        <code>BACKUP_ENCRYPTION_PASSPHRASE</code> to store encrypted{" "}
        <code>.enc</code> files.
      </div>
    </div>
  );
}
