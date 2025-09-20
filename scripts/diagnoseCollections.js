import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

function redact(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = "***";
    if (u.username) u.username = "***";
    return u.toString();
  } catch {
    return "<invalid URI>";
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  console.log("Connecting to:", redact(uri));
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  console.log("DB name:", db.databaseName);

  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const count = await db.collection(c.name).countDocuments({});
    console.log(`${c.name.padEnd(40)} ${String(count).padStart(8)} docs`);
  }

  await mongoose.disconnect();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
