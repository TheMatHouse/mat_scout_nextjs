// components/dashboard/UserBioSection.jsx
"use client";

import { useEffect, useState } from "react";
import BioEditor from "@/components/shared/BioEditor";
import { toast } from "react-toastify";

export default function UserBioSection({ user }) {
  console.log("USER ", user);
  const [initialHtml, setInitialHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.username) {
        setLoading(false);
        return;
      }

      try {
        // 1) Prefer dedicated bio endpoint if present
        let bioHtml = "";
        try {
          const bioRes = await fetch(
            `/api/users/${encodeURIComponent(user.username)}/bio`,
            { cache: "no-store" }
          );
          if (bioRes.ok) {
            const bioData = await bioRes.json().catch(() => ({}));
            // accept either shape: { bioHtml } or { bio }
            bioHtml = bioData?.bioHtml ?? bioData?.bio ?? "";
          }
        } catch {
          // ignore and fall back
        }

        // 2) Fall back to general user endpoint if needed
        if (!bioHtml) {
          const res = await fetch(
            `/api/users/${encodeURIComponent(user.username)}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const u = data?.user || {};
            bioHtml = u.bioHtml ?? u.bio ?? "";
          }
        }

        if (!cancelled) {
          setInitialHtml(typeof bioHtml === "string" ? bioHtml : "");
        }
      } catch (e) {
        if (!cancelled) toast.error("Unable to load bio");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  const handleSave = async (html) => {
    if (!user?.username) {
      toast.error("Missing username");
      return;
    }
    setSaving(true);
    try {
      // Prefer dedicated bio route if you added it
      let ok = false;
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(user.username)}/bio`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bioHtml: html }),
          }
        );
        ok = res.ok;
      } catch {
        ok = false;
      }

      // Fallback: PATCH to the main users route with a bioHtml field
      if (!ok) {
        const res2 = await fetch(
          `/api/users/${encodeURIComponent(user.username)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bioHtml: html }),
          }
        );
        if (!res2.ok) {
          const msg = await res2.text().catch(() => "Failed to save bio");
          throw new Error(msg);
        }
      }

      setInitialHtml(html);
      toast.success("Bio saved");
    } catch (e) {
      toast.error(e?.message || "Error saving bio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-white dark:bg-gray-900 shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
          Bio
        </h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  return (
    <BioEditor
      initialHtml={initialHtml}
      onSave={handleSave}
      saving={saving}
      label="Bio"
      helperText="Add a short bio (up to 1000 characters). It will appear on your public profile."
    />
  );
}
