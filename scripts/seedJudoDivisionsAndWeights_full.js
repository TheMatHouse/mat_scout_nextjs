// scripts/seedJudoDivisionsAndWeights_full.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// models (use your exact filenames/exports)
import styleModel from "../models/styleModel.js";
import division from "../models/division.js";
import weightCategory from "../models/weightCategoryModel.js";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_STAGING_URI;
if (!MONGO_URI) {
  console.error("❌ Missing MONGODB_URI (or MONGODB_STAGING_URI)");
  process.exit(1);
}

// ---------- helpers ----------
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

async function ensureStyle(name) {
  let doc =
    (await styleModel.findOne({ styleName: name }).lean()) ||
    (await styleModel
      .findOne({ styleName: new RegExp(`^${name}$`, "i") })
      .lean());
  if (doc) return doc;
  doc = await styleModel.create({ styleName: name });
  return doc.toObject();
}

async function upsertWeightCategory({ styleId, name, unit = "kg", items }) {
  // find by exact or case-insensitive
  let wc =
    (await weightCategory.findOne({ name }).lean()) ||
    (await weightCategory
      .findOne({ name: new RegExp(`^${name}$`, "i") })
      .lean());
  if (wc) {
    // ensure unit/items are present (don’t destructively overwrite existing custom lists)
    const needsUpdate =
      (unit && wc.unit !== unit) ||
      (Array.isArray(items) &&
        items.length &&
        (!wc.items || wc.items.length === 0));
    if (needsUpdate) {
      await weightCategory.updateOne(
        { _id: wc._id },
        { $set: { unit, ...(items?.length ? { items } : {}) } }
      );
    }
    return wc;
  }
  wc = await weightCategory.create({ style: styleId, name, unit, items });
  return wc.toObject();
}

async function upsertDivision({
  styleId,
  name,
  gender,
  weightCategoryId,
  eligibility,
}) {
  const filter = { style: styleId, name, gender };
  const update = {
    $set: {
      weightCategory: weightCategoryId,
      ...(eligibility ? { eligibility } : {}),
    },
  };
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  const doc = await division.findOneAndUpdate(filter, update, opts).lean();
  return doc;
}

function makeItemsFromLabels(labels) {
  return labels.map((l) => ({ label: String(l) }));
}

// ---------- canonical weight lists ----------

// IJF / Senior (Olympic) weights
const SENIOR_MEN = [
  "60 kg",
  "66 kg",
  "73 kg",
  "81 kg",
  "90 kg",
  "100 kg",
  "+100 kg",
];
const SENIOR_WOMEN = [
  "48 kg",
  "52 kg",
  "57 kg",
  "63 kg",
  "70 kg",
  "78 kg",
  "+78 kg",
];

// USA Judo youth (8U/10U/12U) examples
const YOUTH_BOYS = [
  "23 kg",
  "26 kg",
  "30 kg",
  "34 kg",
  "38 kg",
  "42 kg",
  "47 kg",
  "52 kg",
  "58 kg",
  "65 kg",
  "75 kg",
  "+75 kg",
];
const YOUTH_GIRLS = [
  "22 kg",
  "25 kg",
  "28 kg",
  "32 kg",
  "36 kg",
  "40 kg",
  "44 kg",
  "48 kg",
  "53 kg",
  "58 kg",
  "64 kg",
  "+64 kg",
];

// Cadet (U18)
const CADET_MEN = [
  "50 kg",
  "55 kg",
  "60 kg",
  "66 kg",
  "73 kg",
  "81 kg",
  "90 kg",
  "+90 kg",
];
const CADET_WOMEN = [
  "40 kg",
  "44 kg",
  "48 kg",
  "52 kg",
  "57 kg",
  "63 kg",
  "70 kg",
  "+70 kg",
];

// Junior (U21) → same as Senior
const JUNIOR_MEN = SENIOR_MEN;
const JUNIOR_WOMEN = SENIOR_WOMEN;

// Masters: use Senior weights (that’s typical); age split is by division names
const MASTERS_MEN = SENIOR_MEN;
const MASTERS_WOMEN = SENIOR_WOMEN;

// Masters buckets from your message
const MASTERS_M = [
  ["M1", "30–35"],
  ["M2", "36–40"],
  ["M3", "41–45"],
  ["M4", "46–50"],
  ["M5", "51–55"],
  ["M6", "56–60"],
  ["M7", "61–65"],
  ["M8", "66–70"],
  ["M9", "71+"],
];
const MASTERS_F = [
  ["F1", "30–35"],
  ["F2", "36–40"],
  ["F3", "41–45"],
  ["F4", "46–50"],
  ["F5", "51–55"],
  ["F6", "56–60"],
  ["F7", "61–65"],
  ["F8", "66–70"],
  ["F9", "71+"],
];

// Youth division labels
const YOUTH_DIVISIONS = [
  { name: "Bantam 1 (8U)", ages: "Age 7–8" },
  { name: "Bantam 2 (10U)", ages: "Age 9–10" },
  { name: "Intermediate (12U)", ages: "Age 11–12" },
  { name: "Juvenile A (14U)", ages: "Age 13–14" },
  { name: "Juvenile B / Cadet (16U)", ages: "Age 15–16" },
  { name: "IJF Junior (U21)", ages: "Age 17–20" },
];

// ---------- main ----------
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected");

  // Style
  const style = await ensureStyle("Judo");
  const styleId = style._id;
  console.log("Style:", style.styleName, styleId);

  // Weight categories (upsert with items)
  const wc = {};

  wc.SeniorMen = await upsertWeightCategory({
    styleId,
    name: "IJF Senior Men",
    unit: "kg",
    items: makeItemsFromLabels(SENIOR_MEN),
  });
  wc.SeniorWomen = await upsertWeightCategory({
    styleId,
    name: "IJF Senior Women",
    unit: "kg",
    items: makeItemsFromLabels(SENIOR_WOMEN),
  });

  wc.SeniorNoviceMen = wc.SeniorMen; // share weights
  wc.SeniorNoviceWomen = wc.SeniorWomen;

  wc.MastersMen = await upsertWeightCategory({
    styleId,
    name: "IJF Masters Men",
    unit: "kg",
    items: makeItemsFromLabels(MASTERS_MEN),
  });
  wc.MastersWomen = await upsertWeightCategory({
    styleId,
    name: "IJF Masters Women",
    unit: "kg",
    items: makeItemsFromLabels(MASTERS_WOMEN),
  });

  wc.YouthBoys = await upsertWeightCategory({
    styleId,
    name: "USA Judo Youth Boys (8U/10U/12U)",
    unit: "kg",
    items: makeItemsFromLabels(YOUTH_BOYS),
  });
  wc.YouthGirls = await upsertWeightCategory({
    styleId,
    name: "USA Judo Youth Girls (8U/10U/12U)",
    unit: "kg",
    items: makeItemsFromLabels(YOUTH_GIRLS),
  });

  wc.CadetMen = await upsertWeightCategory({
    styleId,
    name: "IJF Cadet Men (U18)",
    unit: "kg",
    items: makeItemsFromLabels(CADET_MEN),
  });
  wc.CadetWomen = await upsertWeightCategory({
    styleId,
    name: "IJF Cadet Women (U18)",
    unit: "kg",
    items: makeItemsFromLabels(CADET_WOMEN),
  });

  wc.JuniorMen = await upsertWeightCategory({
    styleId,
    name: "IJF Junior Men (U21)",
    unit: "kg",
    items: makeItemsFromLabels(JUNIOR_MEN),
  });
  wc.JuniorWomen = await upsertWeightCategory({
    styleId,
    name: "IJF Junior Women (U21)",
    unit: "kg",
    items: makeItemsFromLabels(JUNIOR_WOMEN),
  });

  // Divisions to upsert (gender baked in)
  const toMake = [];

  // Youth divisions (boys/girls)
  for (const y of YOUTH_DIVISIONS) {
    if (norm(y.name).includes("cadet") || norm(y.name).includes("juvenile b")) {
      // use Cadet weights (U18)
      toMake.push(
        {
          name: y.name,
          gender: "male",
          weightCategoryId: wc.CadetMen._id,
          eligibility: { note: y.ages },
        },
        {
          name: y.name,
          gender: "female",
          weightCategoryId: wc.CadetWomen._id,
          eligibility: { note: y.ages },
        }
      );
    } else if (norm(y.name).includes("junior")) {
      // IJF Junior (U21) → Senior weights
      toMake.push(
        {
          name: y.name,
          gender: "male",
          weightCategoryId: wc.JuniorMen._id,
          eligibility: { note: y.ages },
        },
        {
          name: y.name,
          gender: "female",
          weightCategoryId: wc.JuniorWomen._id,
          eligibility: { note: y.ages },
        }
      );
    } else {
      // 8U / 10U / 12U buckets share youth weights
      toMake.push(
        {
          name: y.name,
          gender: "male",
          weightCategoryId: wc.YouthBoys._id,
          eligibility: { note: y.ages },
        },
        {
          name: y.name,
          gender: "female",
          weightCategoryId: wc.YouthGirls._id,
          eligibility: { note: y.ages },
        }
      );
    }
  }

  // Senior + Senior Novice (men/women)
  toMake.push(
    {
      name: "Senior",
      gender: "male",
      weightCategoryId: wc.SeniorMen._id,
      eligibility: { note: "Age 15+ (18+ intl)" },
    },
    {
      name: "Senior",
      gender: "female",
      weightCategoryId: wc.SeniorWomen._id,
      eligibility: { note: "Age 15+ (18+ intl)" },
    },
    {
      name: "Senior Novice",
      gender: "male",
      weightCategoryId: wc.SeniorNoviceMen._id,
      eligibility: { note: "Age 15+ (18+ intl)" },
    },
    {
      name: "Senior Novice",
      gender: "female",
      weightCategoryId: wc.SeniorNoviceWomen._id,
      eligibility: { note: "Age 15+ (18+ intl)" },
    }
  );

  // Masters M1–M9 (men) and F1–F9 (women)
  for (const [code, ages] of MASTERS_M) {
    toMake.push({
      name: `Masters ${code} (${ages})`,
      gender: "male",
      weightCategoryId: wc.MastersMen._id,
      eligibility: { note: `Masters ${code}` },
    });
  }
  for (const [code, ages] of MASTERS_F) {
    toMake.push({
      name: `Masters ${code} (${ages})`,
      gender: "female",
      weightCategoryId: wc.MastersWomen._id,
      eligibility: { note: `Masters ${code}` },
    });
  }

  // Upsert all divisions
  let count = 0;
  for (const d of toMake) {
    await upsertDivision({
      styleId,
      name: d.name,
      gender: d.gender,
      weightCategoryId: d.weightCategoryId,
      eligibility: d.eligibility,
    });
    count++;
    console.log(`↳ upserted: ${d.name} — ${d.gender}`);
  }

  console.log(
    `✅ Done. Upserted ${count} Judo divisions and all referenced weight categories.`
  );
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
