import mongoose from "mongoose";

const userStyleSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    styleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Style",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// export const UserStyle =
//   models.UserStyle || model("UserStyle", userStyleSchema);

const UserStyle =
  mongoose.models.UserStyle || mongoose.model("UserStyle", userStyleSchema);

export default UserStyle;
