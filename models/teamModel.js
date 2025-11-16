// models/teamModel.js
import mongoose from "mongoose";

const SecuritySchema = new mongoose.Schema(
  {
    lockEnabled: { type: Boolean, default: false },
    encVersion: { type: String, default: "v1" },

    // KDF params for deriving the encryption key client-side
    kdf: {
      saltB64: { type: String, default: "" }, // base64 salt
      iterations: { type: Number, default: 250000 },
    },

    // HMAC/Scrypt verifier (no raw password stored server-side)
    verifierB64: { type: String, default: "" },

    // --- Team Box Key (TBK) wrapper (new) ---
    // We never store the raw TBK, only this wrapped form.
    encryption: {
      wrappedTeamKeyB64: { type: String, default: "" }, // TBK encrypted with password-derived key
      teamKeyVersion: { type: Number, default: 1 }, // for future rotations
      algorithm: { type: String, default: "aes-256-gcm" }, // symmetric cipher for TBK + reports
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true },

    teamSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      text: true,
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
    logoType: { type: String, default: "default" },
    logoId: { type: String }, // optional: for deleting uploaded avatars

    requireApproval: { type: Boolean, default: false },

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

    // --- Team Password / Encryption policy ---
    // Safe defaults so existing teams continue to work without any migration.
    security: {
      type: SecuritySchema,
      default: {}, // ensures the object exists on new docs
    },
  },
  { timestamps: true }
);

/**
 * Normalize and backfill on save/create.
 * This does NOT touch existing documents unless they are being saved.
 * It won’t modify any data related to encryption unless you explicitly set it.
 */
teamSchema.pre("save", function (next) {
  if (this.teamSlug) {
    this.teamSlug = String(this.teamSlug).trim().toLowerCase();
  }

  // Backfill security shape if missing
  if (!this.security) this.security = {};
  if (!this.security.kdf) this.security.kdf = {};
  if (typeof this.security.lockEnabled !== "boolean") {
    this.security.lockEnabled = false;
  }
  if (!this.security.encVersion) this.security.encVersion = "v1";
  if (!this.security.kdf.saltB64) this.security.kdf.saltB64 = "";
  if (!this.security.kdf.iterations) this.security.kdf.iterations = 250000;
  if (!this.security.verifierB64) this.security.verifierB64 = "";

  // Backfill encryption sub-doc for Team Box Key
  if (!this.security.encryption) {
    this.security.encryption = {};
  }
  if (!this.security.encryption.algorithm) {
    this.security.encryption.algorithm = "aes-256-gcm";
  }
  if (!this.security.encryption.teamKeyVersion) {
    this.security.encryption.teamKeyVersion = 1;
  }
  if (!this.security.encryption.wrappedTeamKeyB64) {
    this.security.encryption.wrappedTeamKeyB64 = "";
  }

  next();
});

// Optional: hide sensitive fields by default in generic JSON responses.
// Expose them only in routes that need them (e.g., team settings UI).
teamSchema.set("toJSON", {
  transform: (_doc, ret) => {
    // Keep lockEnabled so clients know a password is required,
    // but strip raw parameters unless your route explicitly needs them.
    if (ret.security) {
      ret.security = {
        lockEnabled: !!ret.security.lockEnabled,
        encVersion: ret.security.encVersion || "v1",
        // comment the next two lines back in if a client screen needs them by default:
        // kdf: ret.security.kdf,
        // verifierB64: ret.security.verifierB64,
        // NOTE: we intentionally do NOT expose security.encryption by default.
      };
    }
    return ret;
  },
});

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
export default Team;
