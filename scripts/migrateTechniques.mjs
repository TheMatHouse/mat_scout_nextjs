import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// ------------- Load env: prefer .env.local, fallback .env -------------
const envLocal = path.join(root, ".env.local");
const envDefault = path.join(root, ".env");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
  console.log(`[migrate] Loaded env from .env.local`);
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
  console.log(`[migrate] Loaded env from .env`);
} else {
  console.warn(`[migrate] No .env.local or .env found; relying on process env`);
}

// ------------- Resolve Mongo URI -------------
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  "";

if (!MONGODB_URI) {
  console.error(
    `[migrate] ERROR: No Mongo URI found in env (MONGODB_URI/MONGODB_URL/DATABASE_URL)`
  );
  process.exit(1);
}

// Mask password for log
function maskUri(uri) {
  try {
    const u = new URL(uri);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return uri.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@");
  }
}
console.log(`[migrate] Connecting to: ${maskUri(MONGODB_URI)}`);

// ------------- Import model AFTER setting up root -------------
const { default: Technique } = await import(
  path.join(root, "models/techniquesModel.js")
);

if (!("nameLower" in Technique.schema.paths)) {
  console.error(
    `[migrate] ERROR: Your Technique schema does not have "nameLower". ` +
      `Update models/techniquesModel.js first (add nameLower + pre('validate') hook).`
  );
  process.exit(1);
}

// ------------- Connect -------------
mongoose.set("strictQuery", true);
await mongoose.connect(MONGODB_URI);
console.log(
  `[migrate] Connected. DB: ${mongoose.connection.name} Host: ${mongoose.connection.host}`
);

// ------------- Show current indexes -------------
let indexes = await Technique.collection.indexes();
console.log(`[migrate] BEFORE indexes:`, indexes);

// ------------- Backfill nameLower -------------
const toBackfill = await Technique.countDocuments({
  $or: [{ nameLower: { $exists: false } }, { nameLower: "" }],
});
console.log(`[migrate] Docs missing nameLower: ${toBackfill}`);

if (toBackfill > 0) {
  const cursor = Technique.find({
    $or: [{ nameLower: { $exists: false } }, { nameLower: "" }],
  }).cursor();

  let done = 0;
  for await (const doc of cursor) {
    doc.nameLower = (doc.name || "").toLowerCase().trim();
    await doc.save();
    done++;
    if (done % 50 === 0)
      console.log(`[migrate] ...backfilled ${done}/${toBackfill}`);
  }
  console.log(`[migrate] Backfilled total: ${done}`);
}

// ------------- Drop old unique index on "name" if present -------------
indexes = await Technique.collection.indexes();
const nameIndex = indexes.find(
  (idx) => JSON.stringify(idx.key) === JSON.stringify({ name: 1 })
);
if (nameIndex) {
  try {
    await Technique.collection.dropIndex(nameIndex.name);
    console.log(`[migrate] Dropped old index ${nameIndex.name}`);
  } catch (e) {
    console.warn(
      `[migrate] Could not drop index ${nameIndex.name}: ${e.message}`
    );
  }
} else {
  console.log(`[migrate] No {name:1} index found (nothing to drop)`);
}

// ------------- Resolve duplicates by nameLower -------------
const dupGroups = await Technique.aggregate([
  { $group: { _id: "$nameLower", ids: { $push: "$_id" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
]);

if (dupGroups.length) {
  console.log(
    `[migrate] Found ${dupGroups.length} duplicate groups; resolving...`
  );
  for (const grp of dupGroups) {
    const docs = await Technique.find({ _id: { $in: grp.ids } }).sort({
      approved: -1,
      createdAt: -1,
    });
    const keep = docs.shift(); // keep approved first, then newest
    const toDelete = docs.map((d) => d._id);
    if (toDelete.length) {
      await Technique.deleteMany({ _id: { $in: toDelete } });
      console.log(
        `[migrate] Resolved dup "${grp._id}": kept ${keep._id}, deleted ${toDelete.length}`
      );
    }
  }
} else {
  console.log(`[migrate] No duplicates by nameLower found`);
}

// ------------- Create unique index on nameLower -------------
try {
  await Technique.collection.createIndex({ nameLower: 1 }, { unique: true });
  console.log(`[migrate] Created unique index on {nameLower:1}`);
} catch (e) {
  console.error(
    `[migrate] ERROR creating unique index on nameLower: ${e.message}`
  );
}

// ------------- Show final indexes -------------
indexes = await Technique.collection.indexes();
console.log(`[migrate] AFTER indexes:`, indexes);

// ------------- Done -------------
await mongoose.connection.close();
console.log(`[migrate] Migration complete.`);
