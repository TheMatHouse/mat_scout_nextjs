// components/profile/BioSection.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BioEditor from "@/components/shared/BioEditor";
import { toast } from "react-toastify";

export default function UserBioSection({ user }) {
  const [initialHtml, setInitialHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ref to the rendered bio container (read-only preview)
  const displayRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.username) {
        setLoading(false);
        return;
      }

      try {
        let bioHtml = "";

        // Prefer dedicated bio endpoint
        try {
          const bioRes = await fetch(
            `/api/users/${encodeURIComponent(user.username)}/bio`,
            { cache: "no-store" }
          );
          if (bioRes.ok) {
            const bioData = await bioRes.json().catch(() => ({}));
            bioHtml = bioData?.bioHtml ?? bioData?.bio ?? "";
          }
        } catch {
          // ignore, fall back below
        }

        // Fallback: general user endpoint
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
      } catch {
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
      // First try dedicated route
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

      // Fallback: main users route
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

  // Normalize NBSPs for display (avoid \u00a0 artifacts)
  const displayHtml = useMemo(
    () => (initialHtml || "").replaceAll("&nbsp;", " ").replace(/\u00a0/g, " "),
    [initialHtml]
  );

  // 🔧 DOM patch: ensure markers render even if upstream injected list-none or inline resets.
  useEffect(() => {
    const root = displayRef.current;
    if (!root) return;

    const applyFixes = () => {
      try {
        const uls = root.querySelectorAll("ul");
        const ols = root.querySelectorAll("ol");
        const lis = root.querySelectorAll("li");

        uls.forEach((ul) => {
          ul.style.listStyleType = "disc";
          ul.style.listStylePosition = "outside";
          ul.style.paddingLeft = ul.style.paddingLeft || "1.5rem";
          ul.classList.remove("list-none");
        });
        ols.forEach((ol) => {
          ol.style.listStyleType = "decimal";
          ol.style.listStylePosition = "outside";
          ol.style.paddingLeft = ol.style.paddingLeft || "1.5rem";
          ol.classList.remove("list-none");
        });
        lis.forEach((li) => {
          li.style.display = "list-item";
          li.style.margin = li.style.margin || "4px 0";
          // If a <li> isn’t inside an <ol>, ensure it has a disc marker.
          const parent = li.parentElement;
          if (!parent || parent.tagName.toLowerCase() !== "ol") {
            li.style.listStyleType = li.style.listStyleType || "disc";
          }
          li.classList.remove("list-none");
        });
      } catch {
        // no-op
      }
    };

    // Apply once after mount/HTML injection
    const id = requestAnimationFrame(applyFixes);

    // Also watch for any dynamic changes and re-apply
    const mo = new MutationObserver(applyFixes);
    mo.observe(root, { childList: true, subtree: true, attributes: true });

    return () => {
      cancelAnimationFrame(id);
      mo.disconnect();
    };
  }, [displayHtml]);

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-white dark:bg-gray-900 shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Bio
        </h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </section>
    );
  }

  return (
    <div className="profile-bio">
      {/* Editor (owners can update) */}
      <BioEditor
        initialHtml={initialHtml}
        onSave={handleSave}
        saving={saving}
        label="Bio"
        helperText="Add a short bio (up to 2000 characters). It will appear on your public profile."
      />

      {/* Render saved HTML exactly like the other pages */}
      {displayHtml ? (
        <div
          ref={displayRef}
          className="wysiwyg-content prose dark:prose-invert max-w-none mt-4"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      ) : null}

      {/* Scoped styles: same pattern used elsewhere, with !important to win against resets */}
      <style
        jsx
        global
      >{`
        .profile-bio .wysiwyg-content ul {
          list-style: disc !important;
          list-style-position: outside !important;
          padding-left: 1.25rem !important;
          margin: 0 0 12px !important;
        }
        .profile-bio .wysiwyg-content ol {
          list-style: decimal !important;
          list-style-position: outside !important;
          padding-left: 1.25rem !important;
          margin: 0 0 12px !important;
        }
        .profile-bio .wysiwyg-content ul ul {
          list-style: circle !important;
          margin: 4px 0 8px !important;
        }
        .profile-bio .wysiwyg-content li {
          display: list-item !important;
          margin: 4px 0 !important;
          line-height: 1.5 !important;
        }
        .profile-bio .wysiwyg-content p {
          margin: 0 0 12px !important;
          line-height: 1.6 !important;
        }
        .profile-bio .wysiwyg-content a {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
