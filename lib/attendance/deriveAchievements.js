import AttendanceRecord from "@/models/attendanceRecordModel";
import { ATTENDANCE_BADGES } from "./badges";

export async function deriveAttendanceAchievements(athleteId) {
  const records = await AttendanceRecord.find({ athlete: athleteId })
    .select("attendedAt")
    .sort({ attendedAt: 1 })
    .lean();

  const lifetimeCount = records.length;

  const badges = ATTENDANCE_BADGES.filter(
    (b) => lifetimeCount >= b.threshold
  ).map((b) => b.id);

  // ---- streak calculation (weekly) ----
  const weeks = new Set();

  for (const r of records) {
    const d = new Date(r.attendedAt);
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    weeks.add(`${year}-${week}`);
  }

  let streak = 0;
  let current = getWeekNumber(new Date());
  let year = new Date().getFullYear();

  while (weeks.has(`${year}-${current}`)) {
    streak++;
    current--;
    if (current < 1) {
      year--;
      current = 52;
    }
  }

  return {
    lifetimeCount,
    badges,
    weeklyStreak: streak,
  };
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}
