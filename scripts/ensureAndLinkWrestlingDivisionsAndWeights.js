// scripts/ensureAndLinkWrestlingDivisionsAndWeights.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import styleModel from "../models/styleModel.js";
import division from "../models/divisionModel.js";
import weightCategory from "../models/weightCategoryModel.js";

/* =======================
   WEIGHT SETS (EDITABLE)
   ======================= */

const U8_BOYS_LB = [
  "40",
  "43",
  "46",
  "49",
  "52",
  "55",
  "58",
  "62",
  "67",
  "73",
  "79",
  "86",
  "95",
  "110",
];
const U8_GIRLS_LB = [
  "40",
  "43",
  "46",
  "49",
  "52",
  "55",
  "58",
  "62",
  "67",
  "73",
  "79",
  "86",
  "95",
  "110",
];

const U10_BOYS_LB = [
  "50",
  "53",
  "56",
  "59",
  "63",
  "67",
  "71",
  "75",
  "80",
  "86",
  "92",
  "99",
  "106",
  "115",
];
const U10_GIRLS_LB = [
  "48",
  "51",
  "54",
  "58",
  "62",
  "66",
  "70",
  "75",
  "80",
  "86",
  "92",
  "99",
  "106",
  "115",
];

const U12_BOYS_LB = [
  "60",
  "63",
  "67",
  "71",
  "75",
  "80",
  "85",
  "90",
  "95",
  "100",
  "106",
  "113",
  "120",
  "130",
  "145",
  "160",
];
const U12_GIRLS_LB = [
  "58",
  "61",
  "64",
  "68",
  "72",
  "76",
  "80",
  "85",
  "90",
  "95",
  "100",
  "106",
  "113",
  "120",
  "130",
  "145",
];

const NFHS_BOYS_LB = [
  "106",
  "113",
  "120",
  "126",
  "132",
  "138",
  "144",
  "150",
  "157",
  "165",
  "175",
  "190",
  "215",
  "285",
];
const NFHS_GIRLS_LB = [
  "100",
  "105",
  "110",
  "115",
  "120",
  "125",
  "130",
  "135",
  "140",
  "145",
  "155",
  "170",
  "190",
  "235",
];

const NCAA_MEN_LB = [
  "125",
  "133",
  "141",
  "149",
  "157",
  "165",
  "174",
  "184",
  "197",
  "285",
];
const NCWWC_WOMEN_COLLEGE_LB = [
  "101",
  "109",
  "116",
  "123",
  "130",
  "136",
  "143",
  "155",
  "170",
  "191",
];

const UWW_SR_MEN_FS_KG = [
  "57 kg",
  "61 kg",
  "65 kg",
  "70 kg",
  "74 kg",
  "79 kg",
  "86 kg",
  "92 kg",
  "97 kg",
  "125 kg",
];
const UWW_SR_WOMEN_FS_KG = [
  "50 kg",
  "53 kg",
  "55 kg",
  "57 kg",
  "59 kg",
  "62 kg",
  "65 kg",
  "68 kg",
  "72 kg",
  "76 kg",
];
const UWW_SR_MEN_GR_KG = [
  "55 kg",
  "60 kg",
  "63 kg",
  "67 kg",
  "72 kg",
  "77 kg",
  "82 kg",
  "87 kg",
  "97 kg",
  "130 kg",
];

// Age group placeholders (reuse SR FS until you want exact)
const U23_MEN_FS_KG = UWW_SR_MEN_FS_KG;
const U23_WOMEN_FS_KG = UWW_SR_WOMEN_FS_KG;
const U20_MEN_FS_KG = UWW_SR_MEN_FS_KG;
const U20_WOMEN_FS_KG = UWW_SR_WOMEN_FS_KG;
const U17_MEN_FS_KG = UWW_SR_MEN_FS_KG;
const U17_WOMEN_FS_KG = UWW_SR_WOMEN_FS_KG;

/* helpers */
const items = (labels) => labels.map((l) => ({ label: l }));

async function ensureStyle(name) {
  let s =
    (await styleModel.findOne({ styleName: name }).lean()) ||
    (await styleModel
      .findOne({ styleName: new RegExp(`^${name}$`, "i") })
      .lean());
  if (!s) s = (await styleModel.create({ styleName: name })).toObject();
  return s;
}

async function ensureCategory(styleId, name, unit, labels, gender = "open") {
  let cat =
    (await weightCategory.findOne({ style: styleId, name })) ||
    (await weightCategory.findOne({ name }));
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
  const needsItems = !Array.isArray(cat.items) || cat.items.length === 0;
  const needsUnit = cat.unit !== unit;
  if (needsItems || needsUnit) {
    await weightCategory.updateOne(
      { _id: cat._id },
      { $set: { unit, ...(needsItems ? { items: items(labels) } : {}) } }
    );
  }
  return await weightCategory.findById(cat._id);
}

async function upsertDivision(styleId, name, gender, catId, eligibility) {
  const filter = { style: styleId, name, gender };
  const update = {
    $set: { weightCategory: catId, eligibility: eligibility || {} },
  };
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  return await division.findOneAndUpdate(filter, update, opts);
}

/* main */
(async () => {
  const URI = process.env.MONGODB_URI || process.env.MONGODB_STAGING_URI;
  if (!URI) throw new Error("Missing MONGODB_URI");
  await mongoose.connect(URI);
  console.log("✅ Connected");

  const wrestling = await ensureStyle("Wrestling");
  const styleId = wrestling._id;

  const cats = {
    U8Boys: await ensureCategory(
      styleId,
      "U8 Boys (Folkstyle)",
      "lb",
      U8_BOYS_LB,
      "male"
    ),
    U8Girls: await ensureCategory(
      styleId,
      "U8 Girls (Folkstyle)",
      "lb",
      U8_GIRLS_LB,
      "female"
    ),
    U10Boys: await ensureCategory(
      styleId,
      "U10 Boys (Folkstyle)",
      "lb",
      U10_BOYS_LB,
      "male"
    ),
    U10Girls: await ensureCategory(
      styleId,
      "U10 Girls (Folkstyle)",
      "lb",
      U10_GIRLS_LB,
      "female"
    ),
    U12Boys: await ensureCategory(
      styleId,
      "U12 Boys (Folkstyle)",
      "lb",
      U12_BOYS_LB,
      "male"
    ),
    U12Girls: await ensureCategory(
      styleId,
      "U12 Girls (Folkstyle)",
      "lb",
      U12_GIRLS_LB,
      "female"
    ),

    NfhsBoys: await ensureCategory(
      styleId,
      "High School Boys (Folkstyle)",
      "lb",
      NFHS_BOYS_LB,
      "male"
    ),
    NfhsGirls: await ensureCategory(
      styleId,
      "High School Girls (Folkstyle)",
      "lb",
      NFHS_GIRLS_LB,
      "female"
    ),
    NcaaMen: await ensureCategory(
      styleId,
      "Collegiate Men (Folkstyle)",
      "lb",
      NCAA_MEN_LB,
      "male"
    ),
    NcwwcWomen: await ensureCategory(
      styleId,
      "Collegiate Women (Freestyle)",
      "lb",
      NCWWC_WOMEN_COLLEGE_LB,
      "female"
    ),

    SrMenFS: await ensureCategory(
      styleId,
      "UWW Senior Men (Freestyle)",
      "kg",
      UWW_SR_MEN_FS_KG,
      "male"
    ),
    SrWomenFS: await ensureCategory(
      styleId,
      "UWW Senior Women (Freestyle)",
      "kg",
      UWW_SR_WOMEN_FS_KG,
      "female"
    ),
    SrMenGR: await ensureCategory(
      styleId,
      "UWW Senior Men (Greco-Roman)",
      "kg",
      UWW_SR_MEN_GR_KG,
      "male"
    ),

    U23MenFS: await ensureCategory(
      styleId,
      "UWW U23 Men (Freestyle)",
      "kg",
      U23_MEN_FS_KG,
      "male"
    ),
    U23WomenFS: await ensureCategory(
      styleId,
      "UWW U23 Women (Freestyle)",
      "kg",
      U23_WOMEN_FS_KG,
      "female"
    ),
    U20MenFS: await ensureCategory(
      styleId,
      "UWW Junior U20 Men (Freestyle)",
      "kg",
      U20_MEN_FS_KG,
      "male"
    ),
    U20WomenFS: await ensureCategory(
      styleId,
      "UWW Junior U20 Women (Freestyle)",
      "kg",
      U20_WOMEN_FS_KG,
      "female"
    ),
    U17MenFS: await ensureCategory(
      styleId,
      "UWW Cadet U17 Men (Freestyle)",
      "kg",
      U17_MEN_FS_KG,
      "male"
    ),
    U17WomenFS: await ensureCategory(
      styleId,
      "UWW Cadet U17 Women (Freestyle)",
      "kg",
      U17_WOMEN_FS_KG,
      "female"
    ),
  };

  const plan = [
    { name: "U8 (Folkstyle)", gender: "male", cat: cats.U8Boys },
    { name: "U8 (Folkstyle)", gender: "female", cat: cats.U8Girls },
    { name: "U10 (Folkstyle)", gender: "male", cat: cats.U10Boys },
    { name: "U10 (Folkstyle)", gender: "female", cat: cats.U10Girls },
    { name: "U12 (Folkstyle)", gender: "male", cat: cats.U12Boys },
    { name: "U12 (Folkstyle)", gender: "female", cat: cats.U12Girls },

    { name: "High School (Folkstyle)", gender: "male", cat: cats.NfhsBoys },
    { name: "High School (Folkstyle)", gender: "female", cat: cats.NfhsGirls },
    { name: "Collegiate (Folkstyle)", gender: "male", cat: cats.NcaaMen },
    { name: "Collegiate (Freestyle)", gender: "female", cat: cats.NcwwcWomen },

    { name: "Senior Freestyle", gender: "male", cat: cats.SrMenFS },
    { name: "Senior Freestyle", gender: "female", cat: cats.SrWomenFS },
    { name: "Senior Greco-Roman", gender: "male", cat: cats.SrMenGR },

    { name: "U23 (Freestyle)", gender: "male", cat: cats.U23MenFS },
    { name: "U23 (Freestyle)", gender: "female", cat: cats.U23WomenFS },
    { name: "Junior U20 (Freestyle)", gender: "male", cat: cats.U20MenFS },
    { name: "Junior U20 (Freestyle)", gender: "female", cat: cats.U20WomenFS },
    { name: "Cadet U17 (Freestyle)", gender: "male", cat: cats.U17MenFS },
    { name: "Cadet U17 (Freestyle)", gender: "female", cat: cats.U17WomenFS },
  ];

  let linked = 0;
  for (const d of plan) {
    await upsertDivision(styleId, d.name, d.gender, d.cat._id, d.eligibility);
    linked++;
    console.log(`↳ linked: ${d.name} — ${d.gender}`);
  }

  console.log(`✅ Wrestling seeded. Divisions linked: ${linked}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
