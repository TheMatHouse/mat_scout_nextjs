// components/dashboard/coach-notes/NotePreviewModal.jsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X } from "lucide-react";

/* ---------------- helpers ---------------- */

const fmtDateTime = (d) => {
  try {
    return d ? new Date(d).toLocaleString() : "";
  } catch {
    return String(d || "");
  }
};

const youtubeIdFromUrl = (url = "") => {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i
  );
  return m ? m[1] : null;
};

const toEmbedUrl = (noteVideo = null) => {
  if (!noteVideo || !noteVideo.url) return null;
  if (noteVideo.embedUrl) return noteVideo.embedUrl;

  const vid = youtubeIdFromUrl(noteVideo.url);
  if (!vid) return null;

  const startMs = Math.max(0, Number(noteVideo.startMs || 0) || 0);
  const startSec = Math.floor(startMs / 1000);
  const base = `https://www.youtube-nocookie.com/embed/${vid}`;
  return startSec > 0 ? `${base}?start=${startSec}` : base;
};

const sanitizeForView = (dirtyHtml = "") => {
  if (!dirtyHtml) return "";
  let html = String(dirtyHtml)
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(
      /<\/?(meta|link|title|xml|head|body|html|script|style)[^>]*>/gi,
      ""
    );

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  const ALLOWED = new Set([
    "P",
    "BR",
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "UL",
    "OL",
    "LI",
    "A",
  ]);
  const URL_ATTR = new Set(["href"]);

  const clean = (node) => {
    if (!node) return;
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) return;

    const el = node;
    const tag = el.tagName;

    if (tag && !ALLOWED.has(tag)) {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    const toRemove = [];
    for (const attr of el.attributes || []) {
      const name = attr.name.toLowerCase();
      if (tag === "A" && URL_ATTR.has(name)) {
        const val = (attr.value || "").trim();
        if (/^javascript:/i.test(val)) {
          toRemove.push(name);
        } else {
          el.setAttribute("rel", "nofollow noopener");
          if (!el.getAttribute("target")) el.setAttribute("target", "_blank");
        }
      } else {
        toRemove.push(name);
      }
    }
    toRemove.forEach((n) => el.removeAttribute(n));
    Array.from(el.childNodes).forEach(clean);
  };

  Array.from(root.childNodes).forEach(clean);

  return root.innerHTML
    .replace(/style="[^"]*"/gi, "")
    .replace(/color\s*:\s*[^;"]+;?/gi, "")
    .replace(/caret-color\s*:\s*[^;"]+;?/gi, "")
    .replace(/border-color\s*:\s*[^;"]+;?/gi, "")
    .trim();
};

const HtmlBlock = ({ title, html }) => {
  const safe = useMemo(() => sanitizeForView(html || ""), [html]);
  if (!safe) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </div>
      <div
        className="note-html text-sm text-gray-900 dark:text-gray-100"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </div>
  );
};

const LineBlock = ({ title, children }) => {
  if (!children) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </div>
      <div className="text-sm text-gray-900 dark:text-gray-100">{children}</div>
    </div>
  );
};

/* ---------------- component ---------------- */

const NotePreviewModal = ({ userId, noteId, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState("");
  const escBound = useRef(false);

  useEffect(() => {
    if (!open || !noteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setNote(null);
      try {
        const res = await fetch(
          `/api/dashboard/${userId}/coach-notes/${noteId}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setNote(data?.note || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load note.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, noteId, userId]);

  useEffect(() => {
    if (!open || escBound.current) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    escBound.current = true;
    return () => {
      window.removeEventListener("keydown", onKey);
      escBound.current = false;
    };
  }, [open, onClose]);

  if (!open) return null;

  const videoEmbed = toEmbedUrl(note?.video);
  const videoLabel = note?.video?.label?.trim() || "Video";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      {/* widened modal */}
      <div className="relative z-[101] w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl sm:rounded-2xl rounded-t-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 sm:rounded-t-2xl">
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              {note?.team?.teamName || "Coach’s Note"}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              {note?.event?.name ? `${note.event.name} • ` : ""}
              {fmtDateTime(note?.createdAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body */}
        <div className="p-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              Loading…
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !note ? (
            <div className="text-sm text-gray-900 dark:text-gray-100">
              No data.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-12">
              {/* left: details (narrower) */}
              <div className="sm:col-span-6 space-y-4">
                <LineBlock title="Summary">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">Athlete:</span>{" "}
                    {note.athleteName}
                    {note.opponent?.name && (
                      <>
                        {" "}
                        • <span className="font-medium">Opponent:</span>{" "}
                        {note.opponent.name}
                      </>
                    )}
                    {note.result && (
                      <>
                        {" "}
                        • <span className="font-medium">Result:</span>{" "}
                        {note.result}
                      </>
                    )}
                    {note.score && (
                      <>
                        {" "}
                        • <span className="font-medium">Score:</span>{" "}
                        {note.score}
                      </>
                    )}
                  </div>
                </LineBlock>

                <HtmlBlock
                  title="What Went Well"
                  html={note.whatWentWell}
                />
                <HtmlBlock
                  title="Reinforce"
                  html={note.reinforce}
                />
                <HtmlBlock
                  title="Needs Fix"
                  html={note.needsFix}
                />

                {note.techniques?.ours?.length ||
                note.techniques?.theirs?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {note.techniques.ours?.length ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
                          Our Techniques
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-900 dark:text-gray-100">
                          {note.techniques.ours.map((t, i) => (
                            <li key={`o-${i}`}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {note.techniques.theirs?.length ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
                          Their Techniques
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-900 dark:text-gray-100">
                          {note.techniques.theirs.map((t, i) => (
                            <li key={`t-${i}`}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <HtmlBlock
                  title="Additional Notes"
                  html={note.notes}
                />

                <div className="pt-2 text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Notes by:</span>{" "}
                  {note.coachName || "Coach"}
                </div>
              </div>

              {/* right: video (wider) */}
              <div className="sm:col-span-6">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">
                    {videoLabel}
                  </div>
                  {videoEmbed ? (
                    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <iframe
                        className="w-full aspect-video"
                        src={videoEmbed}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Note video"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      No video attached.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* content styling for rendered HTML */}
      <style
        jsx
        global
      >{`
        .note-html p {
          margin: 0 0 12px;
          line-height: 1.55;
        }
        .note-html ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0 0 12px;
        }
        .note-html ol {
          list-style: decimal;
          padding-left: 1.25rem;
          margin: 0 0 12px;
        }
        .note-html li {
          margin: 4px 0;
          line-height: 1.5;
        }
        .note-html u,
        .note-html span[style*="underline"],
        .note-html [style*="text-decoration: underline"] {
          text-decoration: underline !important;
        }
      `}</style>
    </div>
  );
};

export default NotePreviewModal;
