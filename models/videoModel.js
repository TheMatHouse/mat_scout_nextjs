import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: String,
    notes: String,
    url: String,
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

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);

export default Video;
