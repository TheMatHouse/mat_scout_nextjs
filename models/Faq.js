import mongoose from "mongoose";

const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// IMPORTANT: default export, and reuse existing model if present
export default mongoose.models.Faq || mongoose.model("Faq", FaqSchema);
