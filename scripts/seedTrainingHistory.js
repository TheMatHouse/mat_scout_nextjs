import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../lib/mongo.js";
import AttendanceRecord from "../models/attendanceRecordModel.js";

// 🔴 CHANGE THIS TO YOUR USER ID
const USER_ID = "68c5ab521cff74bd05af45ce";

const fakeClubs = [
  { name: "Northglenn Judo Club" },
  { name: "Denver Judo" },
  { name: "Easton Training Center" },
  { name: "Factory X" },
  { name: "Colorado Wrestling Academy" },
];

const disciplines = ["Judo", "BJJ", "Wrestling"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  await connectDB();

  console.log("🧹 Clearing existing seeded records…");
  await AttendanceRecord.deleteMany({
    athlete: USER_ID,
    createdBy: "athlete",
  });

  const records = [];

  let dayOffset = 0;

  // ~60 sessions across ~4 months
  for (let i = 0; i < 60; i++) {
    const discipline = randomItem(disciplines);
    const club = randomItem(fakeClubs);

    records.push({
      athlete: USER_ID,
      discipline,
      attendedAt: daysAgo(dayOffset),
      club: null, // simulate fallback-only clubs
      clubNameFallback: club.name,
      visibility: Math.random() > 0.15 ? "public" : "private",
      createdBy: "athlete",
    });

    dayOffset += Math.random() > 0.6 ? 2 : 1;
  }

  await AttendanceRecord.insertMany(records);

  console.log(`✅ Seeded ${records.length} training sessions`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
