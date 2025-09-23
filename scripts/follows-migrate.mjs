// scripts/follows-migrate.mjs
import mongoose from "mongoose";

// ⬇️ adjust this import if your file is not exactly at lib/mongo.js
import { connectDB } from "../lib/mongo.js";

// ⬇️ adjust this import if your model file name/path differs
import Follow from "../models/followModel.js";

async function run() {
  await connectDB();

  // Raw collection (default pluralized name for model "Follow")
  const col = mongoose.connection.db.collection("follows");

  // 1) Drop the legacy unique index if it exists
  try {
    await col.dropIndex("followerId_1_followingId_1");
    console.log("Dropped legacy unique index followerId_1_followingId_1");
  } catch (e) {
    console.log("Legacy index not present (ok):", e.message);
  }

  // 2) Backfill old docs (simple->user-target): followingId -> followingUserId
  //    Only modify docs that still have the old field.
  const res = await col.updateMany(
    { followingId: { $exists: true }, followingUserId: { $exists: false } },
    [
      {
        $set: {
          targetType: "user",
          followingUserId: "$followingId",
        },
      },
      { $unset: "followingId" },
    ]
  );
  console.log(`Backfilled ${res.modifiedCount} follow docs`);

  // 3) Ensure new partial unique indexes exist (from the updated model)
  await Follow.syncIndexes();
  console.log("syncIndexes complete.");

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
