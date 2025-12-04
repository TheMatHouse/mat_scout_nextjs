// models/videoModel.js
import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    /* ------------------------------------------------------
       VIDEO PROVIDER
       ------------------------------------------------------ */
    provider: {
      type: String,
      enum: ["youtube", "upload"],
      default: "youtube",
    },

    /* ------------------------------------------------------
       YOUTUBE FIELDS (unchanged)
       ------------------------------------------------------ */
    videoId: {
      type: String,
      trim: true,
    },

    urlCanonical: {
      type: String,
      trim: true,
    },

    startSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ------------------------------------------------------
       UPLOADED VIDEO FIELDS (used when provider = "upload")
       ------------------------------------------------------ */
    // Example: "teams/<teamId>/videos/<id>.mp4"
    path: {
      type: String,
      default: "",
    },

    // e.g., "spaces", "s3" — right now we will default to Spaces
    storage: {
      type: String,
      default: "spaces",
    },

    // All uploaded videos are private — access via signed URL only
    isPrivate: {
      type: Boolean,
      default: true,
    },

    /* ------------------------------------------------------
       NOTES (encrypted if team has password)
       ------------------------------------------------------ */
    notes: { type: String, default: "" },

    // If encrypted under TBK:
    crypto: {
      ciphertextB64: String,
      ivB64: String,
      tagB64: String,
    },

    /* ------------------------------------------------------
       Legacy fields (kept for backward compatibility)
       ------------------------------------------------------ */
    url: { type: String, default: "" },
    originalUrlRaw: { type: String, default: "" },

    /* ------------------------------------------------------
       RELATIONS
       ------------------------------------------------------ */
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

/* ------------------------------------------------------
   INDEXES
------------------------------------------------------ */
videoSchema.index({ provider: 1, videoId: 1 });
videoSchema.index({ createdBy: 1 });

/* ------------------------------------------------------
   VIRTUALS (unchanged for YouTube)
------------------------------------------------------ */
videoSchema.virtual("watchUrl").get(function () {
  if (this.provider === "youtube") {
    return (
      this.urlCanonical ||
      (this.videoId ? `https://www.youtube.com/watch?v=${this.videoId}` : "")
    );
  }

  // For uploaded videos: the signed URL will be fetched on demand
  return null;
});

videoSchema.virtual("embedUrl").get(function () {
  if (this.provider === "youtube") {
    if (!this.videoId) return "";
    const start = Math.max(0, this.startSeconds || 0);
    return `https://www.youtube-nocookie.com/embed/${this.videoId}?start=${start}`;
  }

  // Uploaded videos don't use static embed URLs
  return null;
});

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);
export default Video;
