// scripts/ensureAndLinkBjjDivisionsAndWeights.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import styleModel from "../models/styleModel.js";
import division from "../models/divisionModel.js"; // you said this is your path
import weightCategory from "../models/weightCategoryModel.js";

// ---------- BJJ weight sets (IBJJF-style, rounded; adjust as you like) ----------
const ADULT_MEN_GI = [
  "Rooster 57.5 kg",
  "Light-Feather 64.0 kg",
  "Feather 70.0 kg",
  "Light 76.0 kg",
  "Middle 82.3 kg",
  "Medium-Heavy 88.3 kg",
  "Heavy 94.3 kg",
  "Super-Heavy 100.5 kg",
  "Ultra-Heavy +100.5 kg",
];

const ADULT_WOMEN_GI = [
  "Rooster 48.5 kg",
  "Light-Feather 53.5 kg",
  "Feather 58.5 kg",
  "Light 64.0 kg",
  "Middle 69.0 kg",
  "Medium-Heavy 74.0 kg",
  "Heavy 79.3 kg",
  "Super-Heavy +79.3 kg",
];

// Many tournaments use the same sets for Masters and No-Gi.
// If your org differs, just edit these arrays or split them later.
const MASTERS_MEN_GI = ADULT_MEN_GI;
const MASTERS_WOMEN_GI = ADULT_WOMEN_GI;
const ADULT_MEN_NOGI = ADULT_MEN_GI;
const ADULT_WOMEN_NOGI = ADULT_WOMEN_GI;

// Juvenile (conservative starter set; tweak if your org differs)
const JUVENILE1_MEN_GI = [
  "Rooster 53.5 kg",
  "Light-Feather 58.5 kg",
  "Feather 64.0 kg",
  "Light 69.0 kg",
  "Middle 74.0 kg",
  "Medium-Heavy 79.3 kg",
  "Heavy 84.3 kg",
  "Super-Heavy 89.3 kg",
  "Ultra-Heavy +89.3 kg",
];

const JUVENILE1_WOMEN_GI = [
  "Rooster 44.3 kg",
  "Light-Feather 48.3 kg",
  "Feather 52.5 kg",
  "Light 56.5 kg",
  "Middle 60.5 kg",
  "Medium-Heavy 65.0 kg",
  "Heavy 69.0 kg",
  "Super-Heavy +69.0 kg",
];

const JUVENILE2_MEN_GI = JUVENILE1_MEN_GI;
const JUVENILE2_WOMEN_GI = JUVENILE1_WOMEN_GI;

// ---------- helpers ----------
function items(labels) {
  return labels.map((l) => ({ label: l }));
}

async function ensureStyle(name) {
  let s =
    (await styleModel.findOne({ styleName: name }).lean()) ||
    (await styleModel
      .findOne({ styleName: new RegExp(`^${name}$`, "i") })
      .lean()) ||
    (await styleModel.findOne({ styleName: /brazilian\s*jiu/i }).lean());
  if (!s) {
    s = await styleModel.create({ styleName: name });
    return s.toObject();
  }
  return s;
}

async function ensureCategory(styleId, name, unit, labels, gender = "open") {
  let cat =
    (await weightCategory.findOne({ style: styleId, name })) ||
    (await weightCategory.findOne({ name })); // fallback by name only

  if (!cat) {
    cat = await weightCategory.create({
      style: styleId,
      name,
      unit,
      gender,
      items: items(labels),
    });
    return cat;
  }

  const needsUnit = cat.unit !== unit;
  const needsItems = !Array.isArray(cat.items) || cat.items.length === 0;
  if (needsUnit || needsItems) {
    await weightCategory.updateOne(
      { _id: cat._id },
      { $set: { unit, ...(needsItems ? { items: items(labels) } : {}) } }
    );
  }
  return await weightCategory.findById(cat._id);
}

async function upsertDivision(
  styleId,
  name,
  gender,
  weightCategoryId,
  eligibility
) {
  const filter = { style: styleId, name, gender };
  const update = {
    $set: { weightCategory: weightCategoryId, eligibility: eligibility || {} },
  };
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  return await division.findOneAndUpdate(filter, update, opts);
}

async function run() {
  const URI = process.env.MONGODB_URI || process.env.MONGODB_STAGING_URI;
  if (!URI) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(URI);
  console.log("✅ Connected");

  // 1) Style
  const bjj = await ensureStyle("BJJ"); // or “Brazilian Jiu-Jitsu”
  const styleId = bjj._id;
  console.log("Style:", bjj.styleName, styleId.toString());

  // 2) Weight categories (Gi / No-Gi)
  const cats = {
    AdultMenGi: await ensureCategory(
      styleId,
      "IBJJF Adult Men (Gi)",
      "kg",
      ADULT_MEN_GI,
      "male"
    ),
    AdultWomenGi: await ensureCategory(
      styleId,
      "IBJJF Adult Women (Gi)",
      "kg",
      ADULT_WOMEN_GI,
      "female"
    ),
    AdultMenNoGi: await ensureCategory(
      styleId,
      "IBJJF Adult Men (No-Gi)",
      "kg",
      ADULT_MEN_NOGI,
      "male"
    ),
    AdultWomenNoGi: await ensureCategory(
      styleId,
      "IBJJF Adult Women (No-Gi)",
      "kg",
      ADULT_WOMEN_NOGI,
      "female"
    ),

    MastersMenGi: await ensureCategory(
      styleId,
      "IBJJF Masters Men (Gi)",
      "kg",
      MASTERS_MEN_GI,
      "male"
    ),
    MastersWomenGi: await ensureCategory(
      styleId,
      "IBJJF Masters Women (Gi)",
      "kg",
      MASTERS_WOMEN_GI,
      "female"
    ),

    Juvenile1MenGi: await ensureCategory(
      styleId,
      "IBJJF Juvenile 1 Men (Gi)",
      "kg",
      JUVENILE1_MEN_GI,
      "male"
    ),
    Juvenile1WomenGi: await ensureCategory(
      styleId,
      "IBJJF Juvenile 1 Women (Gi)",
      "kg",
      JUVENILE1_WOMEN_GI,
      "female"
    ),
    Juvenile2MenGi: await ensureCategory(
      styleId,
      "IBJJF Juvenile 2 Men (Gi)",
      "kg",
      JUVENILE2_MEN_GI,
      "male"
    ),
    Juvenile2WomenGi: await ensureCategory(
      styleId,
      "IBJJF Juvenile 2 Women (Gi)",
      "kg",
      JUVENILE2_WOMEN_GI,
      "female"
    ),
  };

  // 3) Divisions to upsert/link
  const toMake = [
    // Adult Gi
    { name: "Adult (Gi)", gender: "male", cat: cats.AdultMenGi },
    { name: "Adult (Gi)", gender: "female", cat: cats.AdultWomenGi },

    // Adult No-Gi
    { name: "Adult (No-Gi)", gender: "male", cat: cats.AdultMenNoGi },
    { name: "Adult (No-Gi)", gender: "female", cat: cats.AdultWomenNoGi },

    // Masters (Gi) — split by age group? Start with aggregated “Masters”
    {
      name: "Masters (Gi)",
      gender: "male",
      cat: cats.MastersMenGi,
      eligibility: { note: "30+" },
    },
    {
      name: "Masters (Gi)",
      gender: "female",
      cat: cats.MastersWomenGi,
      eligibility: { note: "30+" },
    },

    // Juvenile
    {
      name: "Juvenile 1 (Gi)",
      gender: "male",
      cat: cats.Juvenile1MenGi,
      eligibility: { note: "Age 16–17 (IBJJF def.)" },
    },
    {
      name: "Juvenile 1 (Gi)",
      gender: "female",
      cat: cats.Juvenile1WomenGi,
      eligibility: { note: "Age 16–17 (IBJJF def.)" },
    },
    {
      name: "Juvenile 2 (Gi)",
      gender: "male",
      cat: cats.Juvenile2MenGi,
      eligibility: { note: "Age 16–17 (IBJJF def.)" },
    },
    {
      name: "Juvenile 2 (Gi)",
      gender: "female",
      cat: cats.Juvenile2WomenGi,
      eligibility: { note: "Age 16–17 (IBJJF def.)" },
    },
  ];

  // If you want Masters 1..7 (Gi) explicitly, add loops similar to Judo later.
  // For now, a single “Masters (Gi)” keeps it simple; the weights are identical to Adult.

  let upserts = 0;
  for (const d of toMake) {
    await upsertDivision(styleId, d.name, d.gender, d.cat._id, d.eligibility);
    upserts++;
    console.log(`↳ linked: ${d.name} — ${d.gender}`);
  }

  console.log(
    `✅ Done. Upserted/linked ${upserts} BJJ divisions to weight categories.`
  );
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
