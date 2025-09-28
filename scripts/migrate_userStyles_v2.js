// scripts/migrate_userStyles_v2.js
/* eslint-disable no-console */

import UserStyle from "../models/userStyleModel.js"; // keep this path correct

const { MONGODB_URI } = process.env;

async function run() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const unsetRes = await UserStyle.updateMany(
    {},
    {
      $unset: {
        division: 1,
        weightClass: 1,
        weightCategory: 1,
        weightUnit: 1,
        weightItemId: 1,
      },
    }
  );
  console.log("Unset legacy fields:", unsetRes.modifiedCount);

  await UserStyle.fillCurrentRankFromPromotions();
  console.log("Backfilled currentRank from promotions where missing.");

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
