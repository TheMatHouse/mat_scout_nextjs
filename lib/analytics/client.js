// lib/analytics/client.js

// Extract UTM params from current URL
function readUTM() {
  try {
    const u = new URL(window.location.href);
    return {
      source: u.searchParams.get("utm_source") || undefined,
      medium: u.searchParams.get("utm_medium") || undefined,
      campaign: u.searchParams.get("utm_campaign") || undefined,
      term: u.searchParams.get("utm_term") || undefined,
      content: u.searchParams.get("utm_content") || undefined,
    };
  } catch {
    return {};
  }
}

// TTFB sample using PerformanceNavigationTiming if available
function ttfbSample() {
  try {
    const [entry] = performance.getEntriesByType("navigation");
    if (entry && entry.responseStart && entry.requestStart) {
      return Math.max(0, entry.responseStart - entry.requestStart);
    }
  } catch {}
  return undefined;
}

export function sendAnalyticsBeacon({ path }) {
  if (typeof window === "undefined" || !path) return;

  try {
    const payload = {
      ts: Date.now(),
      path,
      referrer: document.referrer || "",
      utm: readUTM(),
      perf: { ttfb: ttfbSample() },
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });

    // Optional header if you set process.env.ANALYTICS_ACCEPT_SECRET on server
    // NOTE: adding a secret header here makes it public—usually unnecessary.
    const headers = {};

    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/analytics/collect", blob);
      if (ok) return;
    }

    // Fallback (fire-and-forget)
    fetch("/api/analytics/collect", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json", ...headers },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // noop
  }
}
