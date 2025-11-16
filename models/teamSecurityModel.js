// /models/teamSecurityModel.js
import pkg from "mongoose";
const { Schema, model, models } = pkg;

/**
 * TeamSecurity
 * Stores encryption config for a team (Option B: Team Password + Team Box Key).
 *
 * We keep this in a separate collection so we don't have to modify your existing Team schema.
 * One document per team.
 */
const KdfParamsSchema = new Schema(
  {
    // For Argon2id: memory, iterations, parallelism; for PBKDF2: iterations
    memory: { type: Number },
    iterations: { type: Number },
    parallelism: { type: Number },
    hash: { type: String }, // e.g., "SHA-256" if PBKDF2
  },
  { _id: false }
);

const EncryptionSchema = new Schema(
  {
    keyVersion: { type: Number, required: true, default: 0 }, // 0 = not set yet
    salt: { type: String }, // base64
    kdf: {
      algo: {
        type: String,
        enum: ["argon2id", "pbkdf2"],
        required: true,
        default: "argon2id",
      },
      params: { type: KdfParamsSchema, required: true, default: {} },
    },
    encTBK: { type: String }, // base64 of TBK encrypted with KEK derived from team password
    isEnabled: { type: Boolean, required: true, default: false }, // true once password is set
  },
  { _id: false }
);

const TeamSecuritySchema = new Schema(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      unique: true,
      index: true,
    },
    encryption: { type: EncryptionSchema, required: true, default: () => ({}) },
  },
  { timestamps: true, minimize: false, strict: true }
);

const TeamSecurity =
  models.TeamSecurity || model("TeamSecurity", TeamSecuritySchema);

export default TeamSecurity;
