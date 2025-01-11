import { Schema, model, models } from "mongoose";

const styleSchema = new Schema(
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

export const Style = models.Style || model("Style", styleSchema);
