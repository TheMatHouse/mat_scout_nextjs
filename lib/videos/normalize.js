// lib/videos/normalize.js

// If user pasted a full <iframe ...>, extract src="...".
export function extractIframeSrc(raw = "") {
  if (typeof raw !== "string") return "";
  if (!raw.includes("<iframe")) return raw.trim();
  const m = raw.match(/src=["']([^"']+)["']/i);
  return (m?.[1] || "").trim();
}

// Best-effort YouTube ID extraction from a URL (watch/share/embed).
export function parseYouTubeVideoId(url = "") {
  try {
    // handle plain id (no url)
    if (/^[a-zA-Z0-9_-]{6,}$/i.test(url) && !url.includes(".")) {
      return url;
    }

    const src = new URL(url);
    // watch?v=ID
    const v = src.searchParams.get("v");
    if (v) return v;

    // youtu.be/ID
    const path = src.pathname || "";
    const host = src.hostname || "";
    if (/youtu\.be$/i.test(host)) {
      const id = path.split("/").filter(Boolean)[0];
      if (id) return id;
    }

    // /embed/ID
    const em = path.match(/\/embed\/([^/?]+)/i);
    if (em?.[1]) return em[1];

    return "";
  } catch {
    return "";
  }
}

// Parse t/start from url if present; returns integer seconds >= 0
export function parseStartSecondsFromUrl(url = "") {
  try {
    const u = new URL(url);
    const t = u.searchParams.get("t");
    const start = u.searchParams.get("start");
    if (start && /^\d+$/.test(start)) return Math.max(0, parseInt(start, 10));
    if (t) {
      // supports "90", "90s", "1h2m3s"
      if (/^\d+$/.test(t)) return Math.max(0, parseInt(t, 10));
      if (/^\d+s$/.test(t)) return Math.max(0, parseInt(t, 10));
      const h = /(\d+)h/.exec(t)?.[1];
      const m = /(\d+)m/.exec(t)?.[1];
      const s = /(\d+)s/.exec(t)?.[1];
      const secs =
        (h ? parseInt(h, 10) * 3600 : 0) +
        (m ? parseInt(m, 10) * 60 : 0) +
        (s ? parseInt(s, 10) : 0);
      return Math.max(0, secs || 0);
    }
  } catch {
    /* noop */
  }
  return 0;
}

export function toCanonicalWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// The one function you call on the server to sanitize one incoming video item.
export function normalizeIncomingVideo(input = {}) {
  const rawUrl = String(input.url || "").trim();
  const cleaned = extractIframeSrc(rawUrl);
  const videoId = parseYouTubeVideoId(cleaned);
  if (!videoId) {
    return { ok: false, reason: "No YouTube videoId found", data: null };
  }

  const urlStartSeconds = parseStartSecondsFromUrl(cleaned);
  const explicit = parseInt(
    typeof input.startSeconds === "number"
      ? input.startSeconds
      : input?.startSeconds || 0,
    10
  );
  const startSeconds = Math.max(
    0,
    isNaN(explicit) ? urlStartSeconds : explicit
  );

  const payload = {
    provider: "youtube",
    videoId,
    urlCanonical: toCanonicalWatchUrl(videoId),
    startSeconds,
    title: String(input.title || ""),
    notes: String(input.notes || ""),
    originalUrlRaw: rawUrl,
  };

  return { ok: true, reason: null, data: payload };
}
