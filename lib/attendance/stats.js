import AthleteAttendanceStats from "@/models/athleteAttendanceStatsModel";

/**
 * Increment attendance counters for an athlete
 */
export async function incrementAttendanceStats(athleteId) {
  const stats =
    (await AthleteAttendanceStats.findOne({ athlete: athleteId })) ||
    (await AthleteAttendanceStats.create({ athlete: athleteId }));

  stats.lifetimeClasses += 1;
  stats.rankCycleClasses += 1;

  await stats.save();
}

/**
 * Reset rank cycle stats when athlete is promoted
 * Call this from your existing rank update flow
 */
export async function resetRankCycleStats(athleteId, newRank) {
  const stats =
    (await AthleteAttendanceStats.findOne({ athlete: athleteId })) ||
    (await AthleteAttendanceStats.create({ athlete: athleteId }));

  stats.rankCycleClasses = 0;
  stats.currentRank = newRank;
  stats.lastPromotionDate = new Date();

  await stats.save();
}
