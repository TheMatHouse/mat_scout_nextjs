// lib/backup/dump.js
import { connectDB } from "@/lib/mongo";

// Core models (known to exist in your app)
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";
import ScoutingReport from "@/models/scoutingReportModel";
import ContactThread from "@/models/contactThreadModel";

// --- Optional models (we'll load them safely) ---
async function tryLoadModel(path) {
  try {
    const mod = await import(path);
    return mod?.default || null;
  } catch {
    // model file not present; skip gracefully
    return null;
  }
}

/**
 * Dump all key collections to plain objects.
 * By default EXCLUDES sensitive fields like password hashes.
 * Pass { includeSensitive: true } to include everything.
 *
 * Added optional collections:
 * - UserStyle         (@/models/userStyleModel)
 * - Notification      (@/models/notificationModel)
 * - TeamUpdate        (@/models/teamUpdateModel)
 * - Technique         (@/models/techniqueModel)
 * - Video             (@/models/videoModel)
 *
 * If any of these model files don't exist, we skip them.
 */
export async function dumpAll({ includeSensitive = false } = {}) {
  await connectDB();

  // Load optional models if present
  const [
    UserStyle,
    Notification,
    TeamUpdate,
    Technique,
    Video,
    TeamMember, // in case you have a separate team member model
  ] = await Promise.all([
    tryLoadModel("@/models/userStyleModel"),
    tryLoadModel("@/models/notificationModel"),
    tryLoadModel("@/models/teamUpdateModel"),
    tryLoadModel("@/models/techniqueModel"),
    tryLoadModel("@/models/videoModel"),
    tryLoadModel("@/models/teamMemberModel"),
  ]);

  const selectUsers = includeSensitive ? undefined : "-password";

  // Fetch everything in parallel; if a model is null, return [] for it.
  const [
    users,
    teams,
    familyMembers,
    teamMembers,
    matchReports,
    scoutingReports,
    contactThreads,
    userStyles,
    notifications,
    teamUpdates,
    techniques,
    videos,
  ] = await Promise.all([
    User.find().select(selectUsers).lean(),
    Team.find().lean(),
    FamilyMember.find().lean(),
    TeamMember ? TeamMember.find().lean() : Promise.resolve([]),
    MatchReport.find().lean(),
    ScoutingReport.find().lean(),
    ContactThread.find().lean(),
    UserStyle ? UserStyle.find().lean() : Promise.resolve([]),
    Notification ? Notification.find().lean() : Promise.resolve([]),
    TeamUpdate ? TeamUpdate.find().lean() : Promise.resolve([]),
    Technique ? Technique.find().lean() : Promise.resolve([]),
    Video ? Video.find().lean() : Promise.resolve([]),
  ]);

  const snapshot = {
    meta: {
      app: "MatScout",
      createdAt: new Date().toISOString(),
      includeSensitive,
      counts: {
        users: users.length,
        teams: teams.length,
        familyMembers: familyMembers.length,
        teamMembers: teamMembers.length,
        matchReports: matchReports.length,
        scoutingReports: scoutingReports.length,
        contactThreads: contactThreads.length,
        userStyles: userStyles.length,
        notifications: notifications.length,
        teamUpdates: teamUpdates.length,
        techniques: techniques.length,
        videos: videos.length,
      },
    },
    users,
    teams,
    familyMembers,
    teamMembers,
    matchReports,
    scoutingReports,
    contactThreads,
    userStyles,
    notifications,
    teamUpdates,
    techniques,
    videos,
  };

  return snapshot;
}
