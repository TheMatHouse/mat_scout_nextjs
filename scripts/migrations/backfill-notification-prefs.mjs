// Usage: node scripts/migrations/backfill-notification-settings.mjs
// Backfills `notificationSettings.followed` and `notificationSettings.followers`
// without touching any existing values. No app aliases; no lib/mongo import.

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

// --- load env BEFORE anything uses it ---
const cwd = process.cwd();
const envLocal = path.join(cwd, ".env.local");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
dotenv.config(); // fallback to .env

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.NEXT_PUBLIC_MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not defined. Put it in .env.local or .env");
  process.exit(1);
}

// Minimal User model to avoid app imports/aliases
const userSchema = new mongoose.Schema(
  {
    email: String,
    username: String,
    notificationSettings: mongoose.Schema.Types.Mixed,
  },
  { collection: "users" }
);
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  console.log("🔌 Connecting to Mongo…");
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
  console.log("✅ Connected");

  // Ensure notificationSettings exists
  const ops = [];

  ops.push(
    User.updateMany(
      { notificationSettings: { $exists: false } },
      { $set: { notificationSettings: {} } }
    )
  );

  // Ensure followed.* buckets
  ops.push(
    User.updateMany(
      { "notificationSettings.followed": { $exists: false } },
      {
        $set: {
          "notificationSettings.followed": {
            avatarChanges: { inApp: true, email: true },
            matchReports: { inApp: true, email: true },
            profileUpdates: { inApp: true, email: true },
          },
        },
      }
    )
  );

  ops.push(
    User.updateMany(
      { "notificationSettings.followed.avatarChanges": { $exists: false } },
      {
        $set: {
          "notificationSettings.followed.avatarChanges": {
            inApp: true,
            email: true,
          },
        },
      }
    )
  );
  ops.push(
    User.updateMany(
      { "notificationSettings.followed.matchReports": { $exists: false } },
      {
        $set: {
          "notificationSettings.followed.matchReports": {
            inApp: true,
            email: true,
          },
        },
      }
    )
  );
  ops.push(
    User.updateMany(
      { "notificationSettings.followed.profileUpdates": { $exists: false } },
      {
        $set: {
          "notificationSettings.followed.profileUpdates": {
            inApp: true,
            email: true,
          },
        },
      }
    )
  );

  // Ensure followers.newFollower bucket
  ops.push(
    User.updateMany(
      { "notificationSettings.followers": { $exists: false } },
      {
        $set: {
          "notificationSettings.followers": {
            newFollower: { inApp: true, email: true },
          },
        },
      }
    )
  );
  ops.push(
    User.updateMany(
      { "notificationSettings.followers.newFollower": { $exists: false } },
      {
        $set: {
          "notificationSettings.followers.newFollower": {
            inApp: true,
            email: true,
          },
        },
      }
    )
  );

  // Also ensure missing inApp/email keys get filled (don’t overwrite existing values)
  const ensureKey = (path, key) =>
    User.updateMany(
      { [`${path}.${key}`]: { $exists: false } },
      { $set: { [`${path}.${key}`]: true } }
    );

  ops.push(ensureKey("notificationSettings.followed.avatarChanges", "inApp"));
  ops.push(ensureKey("notificationSettings.followed.avatarChanges", "email"));
  ops.push(ensureKey("notificationSettings.followed.matchReports", "inApp"));
  ops.push(ensureKey("notificationSettings.followed.matchReports", "email"));
  ops.push(ensureKey("notificationSettings.followed.profileUpdates", "inApp"));
  ops.push(ensureKey("notificationSettings.followed.profileUpdates", "email"));
  ops.push(ensureKey("notificationSettings.followers.newFollower", "inApp"));
  ops.push(ensureKey("notificationSettings.followers.newFollower", "email"));

  const results = await Promise.all(ops.map((p) => p.exec()));
  results.forEach((r, i) =>
    console.log(
      `op${String(i + 1).padStart(2, "0")}: matched=${
        r.matchedCount
      } modified=${r.modifiedCount}`
    )
  );

  await mongoose.disconnect();
  console.log("✅ Backfill complete.");
}

run().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
