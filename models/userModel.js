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
      //required: true,
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
    googleAvatar: {
      type: String,
    },
    facebookAvatar: {
      type: String,
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
    // tokens: [String],
    // athlete: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Athlete",
    // },
    allowPublic: {
      type: Boolean,
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
  },
  {
    timestamps: true,
  }
);

//export const User = models.User || model("User", userSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
