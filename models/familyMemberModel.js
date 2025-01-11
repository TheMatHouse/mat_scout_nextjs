import { Schema, model, models } from "mongoose";

const familyMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      text: true,
      unique: true,
    },
    gender: {
      type: String,
    },
    avatar: {
      type: String,
      default:
        "https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2Fdefault_user.jpg?alt=media&token=314573ee-36df-471e-bb4e-17f47d0750e1",
    },
    avatarType: {
      type: String,
      default: "default",
    },
    allowPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const FamilyMember =
  models.FamilyMember || model("FamilyMember", familyMemberSchema);
