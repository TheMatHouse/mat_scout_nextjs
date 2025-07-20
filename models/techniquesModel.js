import mongoose from "mongoose";

const techniqueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});

const Technique =
  mongoose.models.Technique || mongoose.model("Technique", techniqueSchema);

export default Technique;
