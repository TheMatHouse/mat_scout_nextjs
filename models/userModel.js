import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
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
      //required: true,
      //unique: true,
    },
    username: {
      type: String,
      required: true,
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
    },
    avatar: {
      type: String,
      required: true,
    },
    // avatar: {
    //   type: String,
    //   default:
    //     "https://firebasestorage.googleapis.com/v0/b/matscout.appspot.com/o/images%2Fdefault_user.jpg?alt=media&token=314573ee-36df-471e-bb4e-17f47d0750e1",
    // },
    // googleAvatar: {
    //   type: String,
    // },
    // avatarType: {
    //   type: String,
    //   default: "default",
    // },
    // verified: {
    //   type: Boolean,
    //   default: false,
    // },
    // tokens: [String],
    // athlete: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Athlete",
    // },
    allowPublic: {
      type: Boolean,
    },
    lastLogin: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

//export const User = models.User || model("User", userSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

//export default User;
