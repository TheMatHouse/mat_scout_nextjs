// models/weightCategory.js
import mongoose from "mongoose";

const weightItemSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., "60 kg", "+100 kg"
  min: Number,
  max: Number,
}); // NOTE: no {_id:false} here → each item gets an _id

const weightCategorySchema = new mongoose.Schema(
  {
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "styleModel",
      required: true,
    },
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "open"], default: "open" },
    unit: { type: String, enum: ["kg", "lb"], required: true },
    items: [weightItemSchema],
    notes: String,
  },
  { timestamps: true }
);

// keep collection name consistent with your DB ("weightcategories")
const weightCategory =
  mongoose.models.weightCategory ||
  mongoose.model("weightCategory", weightCategorySchema, "weightcategories");

export default weightCategory;
