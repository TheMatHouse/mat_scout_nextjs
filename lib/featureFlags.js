export function isClubAttendanceEnabled() {
  return process.env.ENABLE_CLUB_ATTENDANCE === "true";
}
