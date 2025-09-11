// scripts/migrateUserStyles.js
// Run with: node -r dotenv/config scripts/migrateUserStyles.js
import mongoose from "mongoose";
import { connectDB } from "../lib/mongo.js"; // <-- named import
import UserStyle from "../models/userStyleModel.js"; // default export

async function run() {
  await connectDB();

  // Default collection name for model "UserStyle" is "userstyles"
  const coll = mongoose.connection.db.collection("userstyles");

  // 1) Rename legacy fields -> new schema fields
  await coll.updateMany(
    { rank: { $exists: true }, currentRank: { $exists: false } },
    { $rename: { rank: "currentRank" } }
  );
  await coll.updateMany(
    { promotionDate: { $exists: true }, lastPromotedOn: { $exists: false } },
    { $rename: { promotionDate: "lastPromotedOn" } }
  );

  // 2) Backfill promotions + ensure denormalized fields are consistent
  const docs = await UserStyle.find({});
  for (const d of docs) {
    if (d.currentRank && (!d.promotions || d.promotions.length === 0)) {
      const promotedOn =
        d.lastPromotedOn || d.startDate || d.createdAt || new Date();
      d.promotions = [
        { rank: d.currentRank, promotedOn, note: "Backfilled from old schema" },
      ];
      d.lastPromotedOn = promotedOn;
      await d.save();
      continue;
    }

    if (Array.isArray(d.promotions) && d.promotions.length > 0) {
      const last = d.promotions[d.promotions.length - 1];
      if (last?.rank) d.currentRank = last.rank;
      if (last?.promotedOn) d.lastPromotedOn = last.promotedOn;
      await d.save();
      continue;
    }

    // No currentRank and no promotions: leave lastPromotedOn as-is or seed from start/created
    if (!d.lastPromotedOn) {
      d.lastPromotedOn = d.startDate || d.createdAt || undefined;
      await d.save();
    }
  }

  console.log("✅ Migration complete");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
