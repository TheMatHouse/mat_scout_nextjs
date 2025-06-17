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
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const UserStyle =
  mongoose.models.UserStyle || mongoose.model("UserStyle", userStyleSchema);

export default UserStyle;
