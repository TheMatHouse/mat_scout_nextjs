import { Schema, model, models } from "mongoose";

const userStyleSchema = new Schema(
  {
    styleName: {
      type: String,
      required: true,
    },
    rank: {
      type: String,
    },
    promotionDate: {
      type: Date,
    },
    weightClass: {
      type: String,
    },
    division: {
      type: String,
    },
    grip: {
      type: String,
    },
    favoriteTechnique: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserStyle =
  models.UserStyle || model("UserStyle", userStyleSchema);
