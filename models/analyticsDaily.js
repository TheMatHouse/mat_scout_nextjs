// models/analyticsDaily.js
import mongoose from "mongoose";

/**
 * Daily analytics rollups (one document per UTC day).
 * This lets you keep long-term stats even if you purge raw events later.
 */
const AnalyticsDailySchema = new mongoose.Schema(
  {
    // UTC midnight for the day this doc summarizes (unique)
    day: { type: Date, unique: true, index: true },

    // Totals
    pv: { type: Number, default: 0 }, // pageviews
    uv: { type: Number, default: 0 }, // unique visitors (based on rotating visitor hash)

    // Top pages for the day
    pages: [
      {
        path: { type: String },
        pv: { type: Number },
      },
    ],

    // Top referrers for the day
    referrers: [
      {
        referrer: { type: String },
        pv: { type: Number },
      },
    ],

    // UTM summaries
    utm: {
      source: [{ key: String, pv: Number }],
      medium: [{ key: String, pv: Number }],
      campaign: [{ key: String, pv: Number }],
    },

    builtAt: { type: Date, default: Date.now }, // when this rollup was computed
  },
  { versionKey: false }
);

// Helpful secondary index if you often query by page inside a day
AnalyticsDailySchema.index({ "pages.path": 1 });

export default mongoose.models.AnalyticsDaily ||
  mongoose.model("AnalyticsDaily", AnalyticsDailySchema);
