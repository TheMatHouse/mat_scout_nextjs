"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";

function fmtBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "-";
  if (n < 1024) return n + " B";
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    n /= 1024;
    i++;
  } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(1)} ${u[i]}`;
}
function fmtTime(t) {
  try {
    return new Date(t).toLocaleString();
  } catch {
    return "-";
  }
}

export default function ServerBackupsList() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup/list", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Failed to list backups");
        setRows([]);
        return;
      }
      setRows(data.backups || []);
    } catch (e) {
      toast.error(e?.message || "Failed to list backups");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const download = (name) => {
    const a = document.createElement("a");
    a.href = `/api/admin/backup/get?name=${encodeURIComponent(name)}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const del = async (base) => {
    if (!confirm(`Delete backup "${base}" and its sidecar files?`)) return;
    try {
      const res = await fetch("/api/admin/backup/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Delete failed");
        return;
      }
      toast.success(`Deleted: ${data.deleted.join(", ") || "(nothing)"}`);
      load();
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    }
  };

  return (
    <div className="rounded border p-4 bg-white dark:bg-gray-900 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Server backups</h3>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded border"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="overflow-auto rounded border">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-2">Backup</th>
              <th className="text-left p-2">Data file</th>
              <th className="text-right p-2">Size</th>
              <th className="text-left p-2">Encrypted</th>
              <th className="text-left p-2">Modified</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  className="p-3 text-center text-gray-500"
                  colSpan={6}
                >
                  {loading ? "Loading…" : "No backups found."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.base}
                  className="border-t dark:border-gray-800"
                >
                  <td className="p-2 font-mono">{r.base}</td>
                  <td className="p-2">{r.dataName}</td>
                  <td className="p-2 text-right">{fmtBytes(r.dataBytes)}</td>
                  <td className="p-2">{r.encrypted ? "Yes" : "No"}</td>
                  <td className="p-2">{fmtTime(r.mtime)}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => download(r.dataName)}
                        className="px-2 py-1 rounded border"
                        title="Download data"
                      >
                        Download
                      </button>
                      {r.hasSha ? (
                        <button
                          onClick={() => download(r.shaName)}
                          className="px-2 py-1 rounded border"
                          title="Download checksum (.sha256)"
                        >
                          Checksum
                        </button>
                      ) : null}
                      {r.encrypted && r.hasMeta ? (
                        <button
                          onClick={() => download(r.metaName)}
                          className="px-2 py-1 rounded border"
                          title="Download encryption metadata (.meta.json)"
                        >
                          Meta
                        </button>
                      ) : null}
                      <button
                        onClick={() => del(r.base)}
                        className="btn-delete"
                        title="Delete backup + sidecars"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Files are read from <code>BACKUP_DIR</code>. Downloaded items use the
        secure
        <code> /api/admin/backup/get</code> endpoint.
      </div>
    </div>
  );
}
