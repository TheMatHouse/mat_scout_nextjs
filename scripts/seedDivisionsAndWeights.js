// scripts/seedDivisionsAndWeights.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ✅ Use relative imports + .js extensions
import styleModel from "../models/styleModel.js";
import division from "../models/division.js";
import weightCategory from "../models/weightCategoryModel.js";

// ---------- helpers ----------
async function ensureStyle(styleName) {
  let s = await styleModel.findOne({ styleName });
  if (!s) s = await styleModel.create({ styleName });
  return s;
}

async function ensureWeightCategory({ gender, unit, items, notes }) {
  return await weightCategory.findOneAndUpdate(
    // loose match key; adjust if you prefer exact keys
    { gender, unit, notes: notes ?? null, "items.label": items?.[0]?.label },
    { gender, unit, items, notes },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureDivision({
  styleId,
  name,
  genderMode,
  weightCategories,
  eligibility,
  notes,
}) {
  return await division.findOneAndUpdate(
    { style: styleId, name },
    { style: styleId, name, genderMode, weightCategories, eligibility, notes },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ---------- run ----------
async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri);

  // 1) Styles
  const judo = await ensureStyle("Judo");
  const wrestling = await ensureStyle("Wrestling");

  // 2) Weight categories (Judo seniors reused by Senior / Senior Novice / Masters)
  const judoMenSenior = await ensureWeightCategory({
    gender: "male",
    unit: "kg",
    items: [
      { label: "60 kg" },
      { label: "66 kg" },
      { label: "73 kg" },
      { label: "81 kg" },
      { label: "90 kg" },
      { label: "100 kg" },
      { label: "+100 kg" },
    ],
    notes: "Judo Senior/Masters men share these.",
  });

  const judoWomenSenior = await ensureWeightCategory({
    gender: "female",
    unit: "kg",
    items: [
      { label: "48 kg" },
      { label: "52 kg" },
      { label: "57 kg" },
      { label: "63 kg" },
      { label: "70 kg" },
      { label: "78 kg" },
      { label: "+78 kg" },
    ],
    notes: "Judo Senior/Masters women share these.",
  });

  // USA Wrestling 10U boys (lbs) example
  const usaw10UBoys = await ensureWeightCategory({
    gender: "male",
    unit: "lb",
    items: [
      { label: "49" },
      { label: "53" },
      { label: "56" },
      { label: "59" },
      { label: "63" },
      { label: "67" },
      { label: "71" },
      { label: "77" },
      { label: "84" },
      { label: "93" },
      { label: "105" },
      { label: "120" },
    ],
    notes: "USAW 10U boys 2025-26 (example).",
  });

  // 3) Divisions (Judo)
  await ensureDivision({
    styleId: judo._id,
    name: "Senior",
    genderMode: "separate",
    weightCategories: { male: judoMenSenior._id, female: judoWomenSenior._id },
    eligibility: { ageMin: 15 }, // adjust if you enforce 18+ for IJF
    notes: "Senior Novice & Masters reuse these weights.",
  });

  await ensureDivision({
    styleId: judo._id,
    name: "Senior Novice",
    genderMode: "separate",
    weightCategories: { male: judoMenSenior._id, female: judoWomenSenior._id },
    eligibility: {
      ageMin: 15,
      experienceCap: "No black belts (kyu grades only)",
    },
  });

  // Masters bands (extend to M11 as needed)
  for (const band of ["M1 (30–34)", "M2 (35–39)", "M3 (40–44)"]) {
    await ensureDivision({
      styleId: judo._id,
      name: `Masters ${band}`,
      genderMode: "separate",
      weightCategories: {
        male: judoMenSenior._id,
        female: judoWomenSenior._id,
      },
      eligibility: { ageMin: 30, mastersBand: band },
    });
  }

  // 4) Division (Wrestling example)
  await ensureDivision({
    styleId: wrestling._id,
    name: "10U (Boys, 2025-26)",
    genderMode: "separate",
    weightCategories: { male: usaw10UBoys._id },
    eligibility: { birthYearMin: 2016, birthYearMax: 2017 },
  });

  console.log("✅ Seed complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
