import mongoose from "mongoose";

const TechniqueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // canonical, case-insensitive key for unique constraint
    nameLower: { type: String, required: true, unique: true, index: true },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Keep nameLower synced with name
TechniqueSchema.pre("validate", function (next) {
  if (this.name) {
    this.nameLower = this.name.toLowerCase().trim();
  }
  next();
});

const Technique =
  mongoose.models.Technique || mongoose.model("Technique", TechniqueSchema);

export default Technique;
