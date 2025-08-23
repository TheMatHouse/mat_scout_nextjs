// lib/analytics/adminEvents.js
"use client";

/**
 * Thin wrappers around GA4 so you can call one-liners from client components.
 * Requires GA to be loaded (e.g., GAProvider + AdminGATracker in the layout).
 */
import { gaEvent } from "@/lib/gtag";

// tiny helpers to keep params clean
const toStr = (v, fallback = "") =>
  v === undefined || v === null ? fallback : String(v);
const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Admin created a team */
export function adminTeamCreated({ method = "manual" } = {}) {
  gaEvent("admin_team_created", { method: toStr(method, "manual") });
}

/** Admin sent an invite */
export function adminInviteSent({ role = "member" } = {}) {
  gaEvent("admin_invite_sent", { role: toStr(role, "member") });
}

/** A match report was created/published */
export function matchReportCreated({
  style = "(none)",
  userType = "user", // "user" | "family"
  isPublic = false,
} = {}) {
  gaEvent("match_report_created", {
    style: toStr(style, "(none)"),
    user_type: toStr(userType, "user"),
    public: isPublic ? "1" : "0",
  });
}

/** An INDIVIDUAL scouting report was created */
export function scoutingReportCreated({
  style = "(none)",
  opponentName = "(unknown)",
  userType = "user", // "user" | "family"
  tagsCount = 0,
  rating = "", // optional numeric or text
  isPublic = false,
} = {}) {
  gaEvent("scouting_report_created", {
    style: toStr(style, "(none)"),
    opponent_name: toStr(opponentName, "(unknown)"),
    user_type: toStr(userType, "user"),
    tags_count: toNum(tagsCount, 0),
    rating: toStr(rating, ""),
    public: isPublic ? "1" : "0",
  });
}

/** A TEAM scouting report was created */
export function teamScoutingReportCreated({
  teamName = "(unknown)",
  competitionLevel = "", // e.g., "local" | "regional" | "national"
  opponentsCount = 0,
  tagsCount = 0,
  isPublic = false,
} = {}) {
  gaEvent("team_scouting_report_created", {
    team_name: toStr(teamName, "(unknown)"),
    competition_level: toStr(competitionLevel, ""),
    opponents_count: toNum(opponentsCount, 0),
    tags_count: toNum(tagsCount, 0),
    public: isPublic ? "1" : "0",
  });
}
