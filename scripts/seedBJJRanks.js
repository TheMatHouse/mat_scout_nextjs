// scripts/seedBjjRanks.js
/* eslint-disable no-console */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const RANKS_COLLECTION = "ranks";
const STYLE = "bjj";

const BJJ_RANKS = [
  { code: "white", label: "White", order: 1 },
  { code: "gray", label: "Gray", order: 2 },
  { code: "yellow", label: "Yellow", order: 3 },
  { code: "orange", label: "Orange", order: 4 },
  { code: "green", label: "Green", order: 5 },
  { code: "blue", label: "Blue", order: 6 },
  { code: "purple", label: "Purple", order: 7 },
  { code: "brown", label: "Brown", order: 8 },
  { code: "black", label: "Black", order: 9 },
  { code: "black-1", label: "1st Degree Black Belt", order: 10 },
  { code: "black-2", label: "2nd Degree Black Belt", order: 11 },
  { code: "black-3", label: "3rd Degree Black Belt", order: 12 },
  { code: "black-4", label: "4th Degree Black Belt", order: 13 },
  { code: "black-5", label: "5th Degree Black Belt", order: 14 },
  { code: "black-6", label: "6th Degree Black Belt", order: 15 },
  { code: "black-7", label: "7th Degree Black Belt", order: 16 },
  { code: "black-8", label: "8th Degree Black Belt", order: 17 },
  { code: "black-9", label: "9th Degree Black Belt", order: 18 },
  { code: "black-10", label: "10th Degree Black Belt", order: 19 },
];

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const ranks = db.collection(RANKS_COLLECTION);
  const now = new Date();

  for (const r of BJJ_RANKS) {
    const filter = { style: STYLE, code: r.code };
    const update = {
      $setOnInsert: { createdAt: now, __v: 0 },
      $set: {
        style: STYLE,
        code: r.code,
        label: r.label,
        altLabel: "", // keep empty to match your schema; change if you want aliases
        order: r.order,
        active: true,
        updatedAt: now,
      },
    };
    await ranks.updateOne(filter, update, { upsert: true });
    console.log(`✅ upserted: [${STYLE}] ${r.code} — ${r.label}`);
  }

  console.log("\n🎉 Done seeding BJJ ranks.");
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
