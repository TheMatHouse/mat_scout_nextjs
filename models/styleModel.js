import mongoose from "mongoose";

const styleSchema = new mongoose.Schema(
  {
    styleName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Style = mongoose.models.Style || mongoose.models("Style", styleSchema);

export default Style;
