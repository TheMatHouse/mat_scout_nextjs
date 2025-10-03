import mongoose from "mongoose";

const familyMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
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
    bio: { type: Object, default: null }, // Editor.js blocks JSON
    bioText: { type: String, trim: true, maxlength: 1000 }, // plain text for search & limit
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg",
    },
    avatarId: {
      type: String, // Cloudinary public_id
    },
    avatarType: {
      type: String,
      default: "default",
    },
    allowPublic: {
      type: Boolean,
      default: false,
    },
    userStyles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserStyle",
      },
    ],
    matchReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MatchReport",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const FamilyMember =
  mongoose.models.FamilyMember ||
  mongoose.model("FamilyMember", familyMemberSchema);

export default FamilyMember;
