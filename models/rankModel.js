// models/rank.js (Mongoose style as example)
import mongoose from "mongoose";

const RankSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // e.g. "yellow", "brown-1", "black-3"
  },
  label: {
    type: String,
    required: true, // Display name, e.g. "Yellow Belt"
  },
  altLabel: {
    type: String,
    default: "", // Optional: Japanese or other notation, e.g. "Rokkyu (6th kyu)"
  },
  order: {
    type: Number,
    required: true, // Controls sort order
  },
  style: {
    type: String,
    default: "judo", // e.g. "judo", "bjj", "wrestling"
  },
  active: {
    type: Boolean,
    default: true, // Allows deactivating a rank without deleting
  },
});

export default mongoose.models.Rank || mongoose.model("Rank", RankSchema);
