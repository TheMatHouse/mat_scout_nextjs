// models/videoModel.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    // ---- Canonical video metadata (new) ----
    provider: {
      type: String,
      enum: ["youtube"],
      default: "youtube",
    },
    // e.g., "v8p0Phhmbx4"
    videoId: {
      type: String,
      required: true,
      trim: true,
    },
    // Canonical watch URL we build from videoId (e.g., https://www.youtube.com/watch?v=...)
    urlCanonical: {
      type: String,
      required: true,
      trim: true,
    },
    // Single, canonical timestamp for where to start playback
    startSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ---- User-entered fields (kept from your model) ----
    title: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Legacy/raw user input (optional; useful if they paste an <iframe> or shortlink)
    // We'll still accept/save `url` for backward-compat, but don't rely on it at render time.
    url: { type: String, default: "" },
    originalUrlRaw: { type: String, default: "" },

    // ---- Relations (kept from your model) ----
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScoutingReport",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Helpful indexes (not unique; adjust if you want to dedupe)
videoSchema.index({ provider: 1, videoId: 1 });
videoSchema.index({ createdBy: 1, videoId: 1 });

// Convenience virtuals (optional)
videoSchema.virtual("watchUrl").get(function () {
  return (
    this.urlCanonical ||
    (this.videoId ? `https://www.youtube.com/watch?v=${this.videoId}` : "")
  );
});
videoSchema.virtual("embedUrl").get(function () {
  if (!this.videoId) return "";
  const start = Math.max(0, this.startSeconds || 0);
  return `https://www.youtube-nocookie.com/embed/${this.videoId}?start=${start}`;
});

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);
export default Video;
