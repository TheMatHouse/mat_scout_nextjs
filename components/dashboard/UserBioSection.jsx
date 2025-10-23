// components/dashboard/UserBioSection.jsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import BioEditor from "@/components/shared/BioEditor";
import { toast } from "react-toastify";

// Safely escape plain text and convert to minimal HTML
function textToHtml(text = "") {
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!escaped.trim()) return "";
  // double newlines → paragraphs, single newline → <br/>
  return escaped
    .split(/\n{2,}/g)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export default function UserBioSection() {
  const { user, loading: userLoading } = useUser();
  const [initialHtml, setInitialHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (userLoading) return; // wait for user context to finish
      if (!user?.username) {
        setLoading(false);
        return;
      }

      try {
        const url = `/api/users/${encodeURIComponent(user.username)}/bio`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          console.error("[UserBio] GET failed:", res.status, msg);
          throw new Error(msg || `Failed to load bio (${res.status})`);
        }

        const data = await res.json().catch(() => ({}));
        // Prefer rich html; fallback to bioText → html so editor isn’t blank
        const html =
          (typeof data?.bioHtml === "string" && data.bioHtml.trim()) ||
          (typeof data?.bioText === "string" && data.bioText.trim()
            ? textToHtml(data.bioText)
            : "");

        if (!cancelled) setInitialHtml(html);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error(e?.message || "Unable to load bio");
          setInitialHtml("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userLoading, user?.username]);

  const handleSave = async (html /* , plain */) => {
    if (!user?.username) {
      toast.error("Missing username");
      return;
    }
    setSaving(true);
    try {
      const url = `/api/users/${encodeURIComponent(user.username)}/bio`;
      const res = await fetch(url, {
        method: "POST", // your route supports POST; it derives bioText server-side
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bioHtml: html }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to save bio");
        console.error("[UserBio] POST failed:", res.status, msg);
        throw new Error(msg);
      }

      setInitialHtml(html); // keep editor in sync
      toast.success("Bio saved");
    } catch (e) {
      toast.error(e?.message || "Error saving bio");
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || loading) {
    return (
      <section className="rounded-xl border border-border bg-white dark:bg-gray-900 shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">
          Bio
        </h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  if (!user) return null;

  // Force editor to refresh if the loaded HTML length changes
  const editorKey = `${user.username}|${(initialHtml || "").length}`;

  return (
    <BioEditor
      key={editorKey}
      initialHtml={initialHtml}
      onSave={handleSave}
      saving={saving}
      label="Bio"
      helperText="Add a short bio (up to 2000 characters). It will appear on your public profile."
    />
  );
}
