// Run: node -r dotenv/config scripts/cleanupPromotionNotes.js
import { connectDB } from "../lib/mongo.js";
import UserStyle from "../models/userStyleModel.js";

async function run() {
  await connectDB();

  const cursor = UserStyle.find({
    "promotions.note": "Backfilled from old schema",
  }).cursor();
  for await (const doc of cursor) {
    doc.promotions = doc.promotions.map((p) => {
      if (p?.note === "Backfilled from old schema") {
        const { note, ...rest } = p.toObject ? p.toObject() : p;
        return rest; // drop note
      }
      return p;
    });
    await doc.save();
  }

  console.log("✅ Cleaned backfilled notes");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
