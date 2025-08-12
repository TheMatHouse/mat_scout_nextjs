"use client";

import { useEffect, useState, useCallback } from "react";
import TeamUpdateForm from "@/components/teams/forms/TeamUpdateForm";
import TeamUpdatesList from "@/components/teams/TeamUpdatesList";
import { toast } from "react-toastify";
import Link from "next/link";

export default function TeamUpdatesClient({ slug, teamName, canPost }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/updates?limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load updates");
      setUpdates(data.updates || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not load updates.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {teamName} — Updates
          </h1>
          <div className="text-sm text-gray-400">
            <Link
              href={`/teams/${slug}`}
              className="underline underline-offset-2"
            >
              ← Back to team
            </Link>
          </div>
        </div>
      </div>

      {canPost && (
        <div className="bg-[#0f172a] rounded-xl border border-slate-800/70 p-4">
          <TeamUpdateForm
            slug={slug}
            onCreated={load}
          />
        </div>
      )}

      <div className="bg-[#0f172a] rounded-xl border border-slate-800/70 p-4">
        <TeamUpdatesList
          updates={updates}
          loading={loading}
        />
      </div>
    </div>
  );
}
