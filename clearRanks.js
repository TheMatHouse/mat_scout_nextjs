import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const ranks = db.collection("ranks");

  console.log("🧹 Deleting all documents from ranks…");
  const result = await ranks.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} ranks.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("💥 Error:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
