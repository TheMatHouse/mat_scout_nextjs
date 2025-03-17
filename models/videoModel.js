import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    videoTitle: {
      type: String,
      required: true,
    },
    videoURL: {
      type: String,
      required: true,
    },
    videoNotes: {
      type: String,
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true,
    },
  },
  {
    timeStamps: true,
  }
);

const Video = mongoose.models.Video || mongoose.model("Video", videoSchema);

export default Video;
