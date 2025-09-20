// models/division.js
import mongoose from "mongoose";

const divisionSchema = new mongoose.Schema(
  {
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "styleModel",
      required: true,
    },
    name: { type: String, required: true }, // e.g., "Senior Men"
    gender: { type: String, enum: ["male", "female", "coed"], required: true },
    weightCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "weightCategory",
      required: true,
    },
    eligibility: { type: Object }, // optional metadata
  },
  { timestamps: true }
);

// 👇 IMPORTANT: 3rd arg "divisions" matches your actual collection with 6 docs
const division =
  mongoose.models.division ||
  mongoose.model("division", divisionSchema, "divisions");

export default division;
