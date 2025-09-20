// scripts/migrateDivisionsToGendered.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import division from "../models/division.js";
import weightCategory from "../models/weightCategoryModel.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const divisions = await division
    .find({
      $or: [
        { gender: { $exists: false } },
        { weightCategories: { $exists: true } },
      ],
    })
    .lean();

  for (const d of divisions) {
    // Skip if already migrated
    if (d.gender && d.weightCategory) continue;

    // old shape had: d.weightCategories?.male / .female
    const maleId = d.weightCategories?.male;
    const femaleId = d.weightCategories?.female;
    const openId = d.weightCategories?.open;

    // create gendered copies (men/women) if present
    if (maleId) {
      await division.findOneAndUpdate(
        { style: d.style, name: `${d.name} Men` },
        {
          style: d.style,
          name: `${d.name} Men`,
          gender: "male",
          weightCategory: maleId,
          eligibility: d.eligibility,
          notes: d.notes,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    if (femaleId) {
      await division.findOneAndUpdate(
        { style: d.style, name: `${d.name} Women` },
        {
          style: d.style,
          name: `${d.name} Women`,
          gender: "female",
          weightCategory: femaleId,
          eligibility: d.eligibility,
          notes: d.notes,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    if (openId && !maleId && !femaleId) {
      // unified/open division (rare, but supported)
      await division.findOneAndUpdate(
        { style: d.style, name: d.name },
        {
          style: d.style,
          name: d.name,
          gender: "open",
          weightCategory: openId,
          eligibility: d.eligibility,
          notes: d.notes,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Optional: remove the old combined division
    await division.deleteOne({ _id: d._id });
  }

  console.log("✅ Migration complete");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
