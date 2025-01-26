import mongoose from "mongoose";

const techniqueSchema = new mongoose.Schema({
  techniqueName: {
    type: String,
    required: true,
  },
});

const Technique =
  mongoose.models.Technique || mongoose.model("Technique", techniqueSchema);

export default Technique;
