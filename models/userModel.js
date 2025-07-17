import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      default: "USER",
    },
    password: {
      type: String,
      // required: true,
    },
    city: { type: String },
    state: { type: String },
    country: { type: String },

    bYear: {
      type: Number,
      trim: true,
    },
    bMonth: {
      type: Number,
      trim: true,
    },
    bDay: {
      type: Number,
      trim: true,
    },

    tempPassword: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "not specified"],
      default: "not specified",
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/matscout/image/upload/v1747956346/default_user_rval6s.jpg",
    },
    avatarId: {
      type: String, // Optional — for deleting uploaded avatars
    },
    googleAvatar: {
      type: String,
      select: true,
    },
    facebookAvatar: {
      type: String,
      select: true,
    },
    avatarType: {
      type: String,
      default: "default",
    },
    provider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    allowPublic: {
      type: Boolean,
      default: false,
    },
    lastLogin: { type: Date, default: Date.now },
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
    scoutingReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScoutingReport",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
