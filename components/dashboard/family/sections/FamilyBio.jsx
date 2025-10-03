// components/dashboard/family/sections/FamilyBio.jsx
"use client";

import { useEffect, useState } from "react";
import BioEditor from "@/components/shared/BioEditor";
import { toast } from "react-toastify";

// Safely escape text, then convert newlines to paragraphs/line breaks
function textToHtml(text = "") {
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!escaped.trim()) return "";
  // double newlines → paragraph breaks; single newlines → <br/>
  return escaped
    .split(/\n{2,}/g)
    .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export default function FamilyBio({ member }) {
  const [bioHtml, setBioHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing bio
  useEffect(() => {
    let cancelled = false;

    async function loadBio() {
      try {
        const res = await fetch(
          `/api/family/${encodeURIComponent(member.username)}/bio`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          // Prefer html; if missing, hydrate editor from bioText
          const html =
            (data?.bioHtml && data.bioHtml.trim()) ||
            (data?.bioText ? textToHtml(data.bioText) : "");
          if (!cancelled) setBioHtml(html);
        } else {
          if (!cancelled) setBioHtml("");
        }
      } catch (err) {
        console.error("Error loading family bio:", err);
        if (!cancelled) setBioHtml("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (member?.username) loadBio();
    return () => {
      cancelled = true;
    };
  }, [member?.username]);

  // Save bio
  const handleSave = async (html /*, plainText */) => {
    try {
      setSaving(true);
      const res = await fetch(
        `/api/family/${encodeURIComponent(member.username)}/bio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bioHtml: html }), // server derives bioText
        }
      );

      if (!res.ok) {
        const msg =
          (await res.text().catch(() => "")) ||
          "Failed to save bio. Please try again.";
        toast.error(msg);
        return;
      }

      toast.success("Family member bio saved!");
      setBioHtml(html); // keep editor in sync
    } catch (err) {
      console.error(err);
      toast.error("Error saving bio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading bio…</p>;
  }

  return (
    <div className="max-w-3xl">
      <BioEditor
        initialHtml={bioHtml}
        onSave={handleSave}
        saving={saving}
        label={`Edit Bio for ${member.firstName || member.username}`}
        helperText="This bio will be displayed on their public family profile."
      />
    </div>
  );
}
