// lib/gtag.js

// Public GA ID for client runtime
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

/**
 * Send a page view to GA4. Safe no-op if GA isn't ready.
 */
export function pageview(url) {
  if (!GA_ID || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_ID, { page_path: url });
}

/**
 * Send a custom event to GA4. Safe no-op if GA isn't ready.
 */
export function gaEvent(action, params = {}) {
  if (!GA_ID || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", action, params);
}

// Also export a default object so either import style works:
//   import { pageview } from "@/lib/gtag"
//   import gtag from "@/lib/gtag"; gtag.pageview(...)
const gtag = { GA_ID, pageview, gaEvent };
export default gtag;
