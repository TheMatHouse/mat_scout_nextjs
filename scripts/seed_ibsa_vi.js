// scripts/seed_ibsa_vi.js
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongo.js";
import division from "../models/divisionModel.js";
import weightCategory from "../models/weightCategoryModel.js";
import styleModel from "../models/styleModel.js"; // adjust if your style model path/name differs

const log = (...args) => console.log("ℹ️", ...args);

// Find style id by name used in your app (e.g., "Judo")
async function findStyleIdByName(name = "Judo") {
  const re = new RegExp(`^${name}$`, "i");
  const style = await styleModel
    .findOne({
      $or: [{ styleName: re }, { name: re }, { title: re }, { label: re }],
    })
    .lean();
  if (!style?._id) throw new Error(`Style "${name}" not found.`);
  return style._id;
}

async function ensureWeightCategory(label, unit, itemLabels) {
  const items = (itemLabels || []).map((lbl) => ({ label: lbl }));
  const doc = await weightCategory.findOneAndUpdate(
    { name: label },
    { $set: { name: label, unit, items } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  log(`✓ WeightCategory upserted: ${label} (${doc._id})`);
  return doc._id;
}

async function upsertDivision({
  styleId,
  name,
  gender,
  weightCategoryId,
  meta,
}) {
  const doc = await division.findOneAndUpdate(
    { style: styleId, name, gender }, // ← uses existing schema fields only
    {
      $set: {
        style: styleId,
        name,
        gender, // "male" | "female" | "coed"
        weightCategory: weightCategoryId,
        eligibility: meta || {}, // optional metadata
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  log(`✓ Division upserted: ${name} (${gender}) -> ${doc._id}`);
  return doc._id;
}

async function run() {
  await connectDB();
  console.log("Connected to MongoDB");

  // Use the same style you already use in the app (likely "Judo")
  const styleId = await findStyleIdByName("Judo");

  // IBSA weight categories
  const j1MenWC = await ensureWeightCategory("IBSA J1 Men", "kg", [
    "-64 kg",
    "-70 kg",
    "-81 kg",
    "-95 kg",
    "+95 kg",
  ]);
  const j2MenWC = await ensureWeightCategory("IBSA J2 Men", "kg", [
    "-64 kg",
    "-70 kg",
    "-81 kg",
    "-95 kg",
    "+95 kg",
  ]);
  const j1WomenWC = await ensureWeightCategory("IBSA J1 Women", "kg", [
    "-46 kg",
    "-52 kg",
    "-60 kg",
    "-70 kg",
    "+70 kg",
  ]);
  const j2WomenWC = await ensureWeightCategory("IBSA J2 Women", "kg", [
    "-46 kg",
    "-52 kg",
    "-60 kg",
    "-70 kg",
    "+70 kg",
  ]);

  // IBSA divisions (names you’ll see in the UI)
  await upsertDivision({
    styleId,
    name: "IBSA J1 Men",
    gender: "male",
    weightCategoryId: j1MenWC,
    meta: { org: "IBSA", classification: "J1", vi: true },
  });

  await upsertDivision({
    styleId,
    name: "IBSA J2 Men",
    gender: "male",
    weightCategoryId: j2MenWC,
    meta: { org: "IBSA", classification: "J2", vi: true },
  });

  await upsertDivision({
    styleId,
    name: "IBSA J1 Women",
    gender: "female",
    weightCategoryId: j1WomenWC,
    meta: { org: "IBSA", classification: "J1", vi: true },
  });

  await upsertDivision({
    styleId,
    name: "IBSA J2 Women",
    gender: "female",
    weightCategoryId: j2WomenWC,
    meta: { org: "IBSA", classification: "J2", vi: true },
  });

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
