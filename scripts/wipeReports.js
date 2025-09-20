// scripts/wipeReports.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import matchReportModel from "../models/matchReportModel.js"; // your file
import scoutingReportModel from "../models/scoutingReportModel.js"; // your file

async function count(col) {
  try {
    return await col.countDocuments({});
  } catch {
    return -1;
  }
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  console.log("DB:", db.databaseName);

  // 1) Show possible match-related collections (helps spot name drift)
  const all = await db.listCollections().toArray();
  const maybeMatch = all.filter((c) => /match/i.test(c.name));
  console.log(
    "Collections w/ 'match':",
    maybeMatch.map((c) => c.name)
  );

  // 2) Count via models (what your app uses now)
  const beforeMR = await matchReportModel.countDocuments({});
  const beforeSR = await scoutingReportModel.countDocuments({});
  console.log(
    `Before → matchReportModel: ${beforeMR}, scoutingReportModel: ${beforeSR}`
  );

  // 3) Delete via models
  const mrRes = await matchReportModel.deleteMany({});
  const srRes = await scoutingReportModel.deleteMany({});
  console.log(
    `Model delete → MatchReport deleted: ${mrRes.deletedCount}, Scouting deleted: ${srRes.deletedCount}`
  );

  // 4) Re-count
  const afterMR = await matchReportModel.countDocuments({});
  const afterSR = await scoutingReportModel.countDocuments({});
  console.log(
    `After (model) → matchReportModel: ${afterMR}, scoutingReportModel: ${afterSR}`
  );

  // 5) If match reports still remain, do a raw collection fallback (covers legacy names)
  if (afterMR > 0) {
    const candidates = [
      "matchreports", // default plural of "MatchReport"
      "matchreportmodels", // if model was once named "matchReportModel"
      "matchreport", // singular drift
      "match_reports", // snake drift
    ];

    for (const name of candidates) {
      try {
        const rawCol = db.collection(name);
        const pre = await rawCol.countDocuments({});
        if (pre > 0) {
          const { deletedCount } = await rawCol.deleteMany({});
          console.log(
            `Fallback raw delete on '${name}' → deleted ${deletedCount}`
          );
        } else {
          console.log(`'${name}' has 0 docs, skipping`);
        }
      } catch (e) {
        // collection might not exist; ignore
      }
    }

    // final count via model again
    const finalMR = await matchReportModel.countDocuments({});
    console.log(`Final (model) → matchReportModel: ${finalMR}`);
  }

  await mongoose.disconnect();
  console.log("✅ Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
