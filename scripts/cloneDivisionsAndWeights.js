// scripts/cloneDivisionsAndWeights.js
// Clone Styles, WeightCategories, and Divisions from SOURCE (staging) to DEST (production)
// Usage:
//   node -r dotenv/config scripts/cloneDivisionsAndWeights.js
//   DRY_RUN=1 node -r dotenv/config scripts/cloneDivisionsAndWeights.js
//   WIPE_DEST=1 node -r dotenv/config scripts/cloneDivisionsAndWeights.js
//
// .env must include:
//   SOURCE_MONGODB_URI="mongodb+srv://.../mat_scout_db_staging"
//   DEST_MONGODB_URI="mongodb+srv://.../mat_scout_db"
// (or set MONGODB_STAGING_URI / MONGODB_URI; see getEnv() below)

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/** ---------- Env helpers ---------- */
function getEnv() {
  const SOURCE =
    process.env.SOURCE_MONGODB_URI || process.env.MONGODB_STAGING_URI; // your staging var you’ve been using
  const DEST = process.env.DEST_MONGODB_URI || process.env.MONGODB_URI; // your production var
  if (!SOURCE || !DEST) {
    console.error(
      "❌ Missing SOURCE_MONGODB_URI/MONGODB_STAGING_URI or DEST_MONGODB_URI/MONGODB_URI in .env"
    );
    process.exit(1);
  }
  return {
    SOURCE,
    DEST,
    DRY_RUN: !!process.env.DRY_RUN,
    WIPE_DEST: !!process.env.WIPE_DEST,
  };
}

const { SOURCE, DEST, DRY_RUN, WIPE_DEST } = getEnv();

/** ---------- Minimal inline models (match your project) ---------- */
// NOTE: We define minimal schemas here to avoid import confusion across two connections.
// Registration names & collections match your app.

const styleSchema = new mongoose.Schema(
  { styleName: { type: String, required: true } },
  { timestamps: true }
);
function Style(conn) {
  return (
    conn.models.styleModel || conn.model("styleModel", styleSchema, "styles")
  );
}

const weightItemSchema = new mongoose.Schema(
  { label: { type: String, required: true }, min: Number, max: Number },
  { _id: false }
);
const weightCategorySchema = new mongoose.Schema(
  {
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "styleModel",
      required: true,
    },
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "open"], default: "open" },
    unit: { type: String, enum: ["kg", "lb"], required: true },
    items: [weightItemSchema],
    notes: String,
  },
  { timestamps: true }
);
function WeightCategory(conn) {
  return (
    conn.models.weightCategory ||
    conn.model("weightCategory", weightCategorySchema, "weightcategories")
  );
}

const divisionSchema = new mongoose.Schema(
  {
    style: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "styleModel",
      required: true,
    },
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "coed"], required: true },
    weightCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "weightCategory",
      required: true,
    },
    eligibility: { type: Object },
  },
  { timestamps: true }
);
function Division(conn) {
  return (
    conn.models.division || conn.model("division", divisionSchema, "divisions")
  );
}

/** ---------- Utility ---------- */
const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();
function keyStyle(s) {
  return norm(s.styleName);
}
function keyWeightCat(styleId, name) {
  return `${styleId}::${norm(name)}`;
}
function keyDivision(styleId, name, gender) {
  return `${styleId}::${norm(name)}::${norm(gender)}`;
}

/** ---------- Main ---------- */
(async () => {
  const src = await mongoose
    .createConnection(SOURCE, { dbName: undefined })
    .asPromise();
  const dst = await mongoose
    .createConnection(DEST, { dbName: undefined })
    .asPromise();

  const SStyle = Style(src);
  const SWeight = WeightCategory(src);
  const SDiv = Division(src);

  const DStyle = Style(dst);
  const DWeight = WeightCategory(dst);
  const DDiv = Division(dst);

  if (WIPE_DEST) {
    console.log(
      "⚠️  WIPE_DEST=1 → will remove ALL styles/divisions/weightcategories in DEST."
    );
    if (!DRY_RUN) {
      await Promise.all([
        DDiv.deleteMany({}),
        DWeight.deleteMany({}),
        // Optional: do NOT wipe styles if you’re using them elsewhere. Comment the next line if needed.
        // DStyle.deleteMany({}),
      ]);
    }
    console.log("✅ Dest wiped (except styles if commented).");
  }

  // 1) Read everything from SOURCE
  const [srcStyles, srcWeights, srcDivs] = await Promise.all([
    SStyle.find({}).lean(),
    SWeight.find({}).lean(),
    SDiv.find({}).lean(),
  ]);

  console.log(
    `📦 From SOURCE: styles=${srcStyles.length}, weightcats=${srcWeights.length}, divisions=${srcDivs.length}`
  );

  // 2) Ensure styles in DEST (by styleName)
  const styleIdMap = new Map(); // srcStyleId -> destStyleId
  for (const s of srcStyles) {
    const name = s.styleName;
    let d = await DStyle.findOne({ styleName: name }).lean();
    if (!d && !DRY_RUN) d = await DStyle.create({ styleName: name });
    if (!d && DRY_RUN) d = { _id: `dry_${name}` };
    styleIdMap.set(String(s._id), String(d._id));
  }
  console.log(`✅ Styles mapped: ${styleIdMap.size}`);

  // 3) Ensure weight categories in DEST (keyed by destStyle + name)
  const weightKeyToId = new Map(); // key = destStyleId::name
  // Preload existing dest cats to avoid re-reading repeatedly
  const destAllCats = await DWeight.find({}).select("style name").lean();
  const existingMap = new Map(
    destAllCats.map((c) => [
      keyWeightCat(String(c.style), c.name),
      String(c._id),
    ])
  );

  let createdCats = 0,
    updatedCats = 0;

  for (const w of srcWeights) {
    const destStyleId = styleIdMap.get(String(w.style));
    if (!destStyleId) continue;

    const k = keyWeightCat(destStyleId, w.name);
    const existingId = existingMap.get(k);
    if (existingId) {
      weightKeyToId.set(k, existingId);
      // Optionally update unit/items/notes to match source
      if (!DRY_RUN) {
        const upd = await DWeight.updateOne(
          { _id: existingId },
          {
            $set: {
              unit: w.unit,
              gender: w.gender || "open",
              notes: w.notes || "",
              items: (Array.isArray(w.items) ? w.items : []).map((i) => ({
                label: i.label,
                min: i.min,
                max: i.max,
              })),
            },
          }
        );
        if (upd.modifiedCount) updatedCats++;
      }
    } else {
      // create
      let created = null;
      if (!DRY_RUN) {
        created = await DWeight.create({
          style: destStyleId,
          name: w.name,
          gender: w.gender || "open",
          unit: w.unit,
          notes: w.notes || "",
          items: (Array.isArray(w.items) ? w.items : []).map((i) => ({
            label: i.label,
            min: i.min,
            max: i.max,
          })),
        });
      }
      const newId = created ? String(created._id) : `dry_wc_${w.name}`;
      weightKeyToId.set(k, newId);
      createdCats++;
    }
  }

  console.log(
    `✅ WeightCategories cloned: created=${createdCats}, updated=${updatedCats}`
  );

  // 4) Ensure divisions in DEST (keyed by destStyle + name + gender) and link to cat
  const destDivs = await DDiv.find({}).select("style name gender").lean();
  const existingDivMap = new Map(
    destDivs.map((d) => [
      keyDivision(String(d.style), d.name, d.gender),
      String(d._id),
    ])
  );

  let createdDivs = 0,
    updatedDivs = 0,
    skippedDivs = 0;

  for (const d of srcDivs) {
    const destStyleId = styleIdMap.get(String(d.style));
    if (!destStyleId) {
      skippedDivs++;
      continue;
    }

    const divKey = keyDivision(destStyleId, d.name, d.gender);
    const wcKey = keyWeightCat(
      destStyleId,
      (srcWeights.find((w) => String(w._id) === String(d.weightCategory)) || {})
        .name || ""
    );
    const destWcId = weightKeyToId.get(wcKey);

    if (!destWcId) {
      console.warn(
        `⚠️  Missing mapped weightCategory for division "${d.name}" (${d.gender}). Skipping link.`
      );
      skippedDivs++;
      continue;
    }

    const exists = existingDivMap.get(divKey);
    if (exists) {
      if (!DRY_RUN) {
        const upd = await DDiv.updateOne(
          { _id: exists },
          {
            $set: {
              weightCategory: destWcId,
              eligibility: d.eligibility || {},
            },
          }
        );
        if (upd.modifiedCount) updatedDivs++;
      }
    } else {
      if (!DRY_RUN) {
        await DDiv.create({
          style: destStyleId,
          name: d.name,
          gender: d.gender,
          weightCategory: destWcId,
          eligibility: d.eligibility || {},
        });
      }
      createdDivs++;
    }
  }

  console.log(
    `✅ Divisions cloned: created=${createdDivs}, updated=${updatedDivs}, skipped=${skippedDivs}`
  );

  await src.close();
  await dst.close();
  console.log(`🎉 Done${DRY_RUN ? " (dry-run)" : ""}.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
