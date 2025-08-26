"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function RestoreClient() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const onPick = (e) => {
    setFile(e.target.files?.[0] || null);
    setPreview(null);
  };

  const post = async (dryRun) => {
    if (!file) {
      toast.error("Please choose a .json.gz backup file.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dryRun", dryRun ? "true" : "false");
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        toast.error(data?.error || "Restore failed");
        return;
      }
      if (dryRun) {
        setPreview(data);
        toast.success("Dry run ready — see preview below.");
      } else {
        setPreview(null);
        toast.success("Restore applied successfully.");
      }
    } catch (e) {
      toast.error(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border p-4 bg-white dark:bg-gray-900 space-y-4 mt-8">
      <h3 className="text-lg font-semibold">Restore (staging only)</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Upload a <code>.json.gz</code> backup. First run a <b>Dry run</b> to
        preview changes. If it looks good, click <b>Apply restore</b> to wipe
        and seed the database with the uploaded data.{" "}
        <span className="text-red-600">This is destructive.</span>
      </p>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".json.gz"
          onChange={onPick}
          className="block"
        />
        <button
          onClick={() => post(true)}
          disabled={!file || loading}
          className="px-3 py-2 rounded border"
        >
          {loading ? "Working…" : "Dry run"}
        </button>
        <button
          onClick={() => {
            if (!file) return;
            if (
              confirm(
                "Are you sure? This will WIPE and RE-SEED the database from the backup."
              )
            ) {
              post(false);
            }
          }}
          disabled={!file || loading}
          className="px-3 py-2 rounded bg-[var(--ms-light-red)] text-white"
        >
          {loading ? "Working…" : "Apply restore"}
        </button>
      </div>

      {preview?.plan?.length ? (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Dry-run preview</h4>
          <div className="overflow-auto rounded border">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2">Collection</th>
                  <th className="text-right p-2">Incoming</th>
                  <th className="text-right p-2">Current</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {preview.plan.map((row) => (
                  <tr
                    key={row.key}
                    className="border-t dark:border-gray-800"
                  >
                    <td className="p-2 font-mono">{row.key}</td>
                    <td className="p-2 text-right">{row.incoming}</td>
                    <td className="p-2 text-right">{row.current}</td>
                    <td className="p-2">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
