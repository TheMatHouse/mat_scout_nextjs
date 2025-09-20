// scripts/seedRanks.js
/* eslint-disable no-console */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const RANKS_COLLECTION = "ranks";

/**
 * Upsert a single rank row.
 * Uniqueness key = { style, code } so re-runs don't duplicate.
 */
async function upsertRank(ranksCol, rank) {
  const now = new Date();
  const filter = { style: rank.style, code: rank.code };
  const update = {
    $setOnInsert: { createdAt: now, __v: 0 },
    $set: {
      style: rank.style,
      code: rank.code,
      label: rank.label,
      altLabel: rank.altLabel ?? "",
      order: rank.order ?? 0,
      active: rank.active ?? true,
      updatedAt: now,
    },
  };
  await ranksCol.updateOne(filter, update, { upsert: true });
  console.log(`✅ [${rank.style}] ${rank.code} — ${rank.label}`);
}

/**
 * Upsert all ranks for a style (array).
 * Sorted by "order" then label to keep logs tidy.
 */
async function upsertStyleRanks(ranksCol, ranks) {
  const sorted = [...ranks].sort((a, b) => {
    if ((a.order ?? 0) !== (b.order ?? 0))
      return (a.order ?? 0) - (b.order ?? 0);
    return String(a.label).localeCompare(String(b.label));
  });
  for (const r of sorted) await upsertRank(ranksCol, r);
}

/**
 * ---- JUDO ----
 * Kyu then Dan (through 10th). Orders aligned to your existing data:
 *   black-6: 13, black-7: 14, black-8: 15, black-9: 16, black-10: 17
 */
const JUDO_RANKS = [
  // Kyu
  {
    style: "judo",
    code: "white",
    label: "6th Kyu (White)",
    altLabel: "",
    order: 1,
  },
  {
    style: "judo",
    code: "yellow",
    label: "5th Kyu (Yellow)",
    altLabel: "",
    order: 2,
  },
  {
    style: "judo",
    code: "orange",
    label: "4th Kyu (Orange)",
    altLabel: "",
    order: 3,
  },
  {
    style: "judo",
    code: "green",
    label: "3rd Kyu (Green)",
    altLabel: "",
    order: 4,
  },
  {
    style: "judo",
    code: "blue",
    label: "2nd Kyu (Blue)",
    altLabel: "",
    order: 5,
  },
  {
    style: "judo",
    code: "brown",
    label: "1st Kyu (Brown)",
    altLabel: "",
    order: 6,
  },
  // Dan
  {
    style: "judo",
    code: "black-1",
    label: "1st Degree Black Belt",
    altLabel: "Shodan",
    order: 7,
  },
  {
    style: "judo",
    code: "black-2",
    label: "2nd Degree Black Belt",
    altLabel: "Nidan",
    order: 8,
  },
  {
    style: "judo",
    code: "black-3",
    label: "3rd Degree Black Belt",
    altLabel: "Sandan",
    order: 9,
  },
  {
    style: "judo",
    code: "black-4",
    label: "4th Degree Black Belt",
    altLabel: "Yondan",
    order: 10,
  },
  {
    style: "judo",
    code: "black-5",
    label: "5th Degree Black Belt",
    altLabel: "Godan",
    order: 11,
  },
  {
    style: "judo",
    code: "black-6",
    label: "6th Degree Black Belt",
    altLabel: "Rokudan",
    order: 13,
  },
  {
    style: "judo",
    code: "black-7",
    label: "7th Degree Black Belt",
    altLabel: "Shichidan",
    order: 14,
  },
  {
    style: "judo",
    code: "black-8",
    label: "8th Degree Black Belt",
    altLabel: "Hachidan",
    order: 15,
  },
  {
    style: "judo",
    code: "black-9",
    label: "9th Degree Black Belt",
    altLabel: "Kudan",
    order: 16,
  },
  {
    style: "judo",
    code: "black-10",
    label: "10th Degree Black Belt",
    altLabel: "Judan",
    order: 17,
  },
];

/**
 * ---- BJJ ----
 * Your requested ladder exactly, including colors and black degrees 1–10.
 * (Even though “Gray/Yellow/Orange/Green” are kids belts in IBJJF,
 * we’re seeding exactly what you listed under style "bjj".)
 */
const BJJ_RANKS = [
  { style: "bjj", code: "white", label: "White", altLabel: "", order: 1 },
  { style: "bjj", code: "gray", label: "Gray", altLabel: "", order: 2 },
  { style: "bjj", code: "yellow", label: "Yellow", altLabel: "", order: 3 },
  { style: "bjj", code: "orange", label: "Orange", altLabel: "", order: 4 },
  { style: "bjj", code: "green", label: "Green", altLabel: "", order: 5 },
  { style: "bjj", code: "blue", label: "Blue", altLabel: "", order: 6 },
  { style: "bjj", code: "purple", label: "Purple", altLabel: "", order: 7 },
  { style: "bjj", code: "brown", label: "Brown", altLabel: "", order: 8 },
  { style: "bjj", code: "black", label: "Black", altLabel: "", order: 9 },
  {
    style: "bjj",
    code: "black-1",
    label: "1st Degree Black Belt",
    altLabel: "",
    order: 10,
  },
  {
    style: "bjj",
    code: "black-2",
    label: "2nd Degree Black Belt",
    altLabel: "",
    order: 11,
  },
  {
    style: "bjj",
    code: "black-3",
    label: "3rd Degree Black Belt",
    altLabel: "",
    order: 12,
  },
  {
    style: "bjj",
    code: "black-4",
    label: "4th Degree Black Belt",
    altLabel: "",
    order: 13,
  },
  {
    style: "bjj",
    code: "black-5",
    label: "5th Degree Black Belt",
    altLabel: "",
    order: 14,
  },
  {
    style: "bjj",
    code: "black-6",
    label: "6th Degree Black Belt",
    altLabel: "",
    order: 15,
  },
  {
    style: "bjj",
    code: "black-7",
    label: "7th Degree Black Belt",
    altLabel: "",
    order: 16,
  },
  {
    style: "bjj",
    code: "black-8",
    label: "8th Degree Black Belt",
    altLabel: "",
    order: 17,
  },
  {
    style: "bjj",
    code: "black-9",
    label: "9th Degree Black Belt",
    altLabel: "",
    order: 18,
  },
  {
    style: "bjj",
    code: "black-10",
    label: "10th Degree Black Belt",
    altLabel: "",
    order: 19,
  },
];

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI in env.");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const ranksCol = db.collection(RANKS_COLLECTION);
  console.log("✅ Connected.");

  console.log("\n➡️  Seeding Judo ranks…");
  await upsertStyleRanks(ranksCol, JUDO_RANKS);

  console.log("\n➡️  Seeding BJJ ranks…");
  await upsertStyleRanks(ranksCol, BJJ_RANKS);

  console.log("\n🎉 Done seeding ranks.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("💥 Seed error:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
