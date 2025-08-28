// models/AnalyticsEvent.js
import mongoose from "mongoose";

/**
 * Raw pageview/beacon events.
 * We DO NOT store raw IPs. We store:
 *  - visitor (daily rotating hash of IP+UA)
 *  - ipHash (stable hash of IP only), both irreversible
 */
const AnalyticsEventSchema = new mongoose.Schema(
  {
    // ⬇️ removed "index: true" here; we will create a TTL index instead
    ts: { type: Date, default: Date.now },

    // page info
    path: { type: String, index: true },
    referrer: { type: String, default: "" },

    // user agent (trimmed)
    ua: { type: String, default: "" },

    // UTM
    utm_source: { type: String, default: "" },
    utm_medium: { type: String, default: "" },
    utm_campaign: { type: String, default: "" },
    utm_term: { type: String, default: "" },
    utm_content: { type: String, default: "" },

    // anonymized identifiers
    visitor: { type: String, index: true }, // rotates daily
    ipHash: { type: String, index: true }, // stable hash of IP (no IP stored)

    // perf sample (optional)
    perf: {
      ttfb: Number, // ms
      fcp: Number, // ms (if provided)
    },

    // day bucket for fast rollups
    day: { type: Date, index: true },
  },
  { versionKey: false }
);

// helpful compound for "top pages in time range"
AnalyticsEventSchema.index({ path: 1, ts: 1 });

/**
 * TTL index: auto-delete raw events after 30 days (2,592,000 seconds) based on "ts".
 * IMPORTANT: we name it "ts_1" to match the default, but we must drop any existing ts_1
 * non-TTL index first (see instructions below).
 */
AnalyticsEventSchema.index(
  { ts: 1 },
  { expireAfterSeconds: 2_592_000, name: "ts_1" }
);

export default mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
