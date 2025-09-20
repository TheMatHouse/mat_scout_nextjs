/* fixRanksIndex.js */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const RANKS_COLLECTION = "ranks";

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
  }

  console.log("🔌 Connecting…");
  await mongoose.connect(MONGODB_URI);
  const ranks = mongoose.connection.db.collection(RANKS_COLLECTION);
  console.log("✅ Connected.");

  const idx = await ranks.indexes();
  console.log(
    "ℹ️ Existing indexes:",
    idx.map((i) => ({ name: i.name, key: i.key, unique: !!i.unique }))
  );

  // Drop the bad unique index on code, if present
  const hasCodeUnique = idx.find((i) => i.name === "code_1" && i.unique);
  if (hasCodeUnique) {
    console.log("🧹 Dropping unique index code_1…");
    await ranks.dropIndex("code_1");
    console.log("✅ Dropped code_1.");
  } else {
    console.log("➡️ No unique code_1 to drop.");
  }

  // Ensure the correct unique compound index
  console.log("🔧 Ensuring unique {style:1, code:1}…");
  await ranks.createIndex(
    { style: 1, code: 1 },
    { unique: true, name: "style_code_unique" }
  );
  console.log("✅ style_code_unique ready.");

  // Optional helper for sorting
  await ranks.createIndex({ style: 1, order: 1 }, { name: "style_order_idx" });

  await mongoose.disconnect();
  console.log("🎉 Index migration complete.");
}
main().catch(async (e) => {
  console.error("💥 Index migration error:", e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
