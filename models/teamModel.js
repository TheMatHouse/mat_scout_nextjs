import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true },
    teamSlug: {
      type: String,
      required: true,
      trim: true,
      text: true,
      unique: true,
    },
    address: { type: String },
    address2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String },
    email: { type: String },
    logoURL: {
      type: String,
      default:
        "https://res.cloudinary.com/matscout/image/upload/v1751375362/temp_logo_vwgmdm.png",
    },
    logoType: {
      type: String,
      default: "default",
    },
    logoId: {
      type: String, // Optional — for deleting uploaded avatars
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    info: {
      type: String,
      default:
        "This is where you can display a public description or other info about the team. You can update this later in the Team Settings tab.",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

export default Team;
