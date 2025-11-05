import pkg from "mongoose";
const { Schema, model, models } = pkg;

const SiteConfigSchema = new Schema(
  {
    // "off" | "maintenance" | "updating"
    maintenanceMode: {
      type: String,
      enum: ["off", "maintenance", "updating"],
      default: "off",
    },
    // Optional custom messages
    maintenanceMessage: {
      type: String,
      default: "We’re doing some maintenance. Please check back soon.",
    },
    updatingMessage: {
      type: String,
      default:
        "We’re rolling out updates. The site will be back in a few minutes.",
    },
    // Last toggled by
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const SiteConfig = models.SiteConfig || model("SiteConfig", SiteConfigSchema);
export default SiteConfig;
