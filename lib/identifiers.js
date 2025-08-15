// lib/identifiers.js
const RESERVED = new Set([
  "admin",
  "root",
  "support",
  "help",
  "login",
  "logout",
  "signup",
  "register",
  "settings",
  "account",
  "me",
  "user",
  "users",
  "api",
  "docs",
  "about",
  "contact",
  "dashboard",
  "teams",
  "team",
  "scouting",
  "matches",
  "match",
  "invite",
  "accept-invite",
  "matscout",
  "static",
  "_next",
  "404",
  "500",
]);

// Lowercase, never full email, no dots/spaces, only a-z 0-9 - _
export function sanitizeUsername(input = "") {
  let u = String(input).trim().toLowerCase();
  if (u.includes("@")) u = u.split("@")[0]; // local-part only
  u = u.replace(/[.\s]+/g, ""); // drop dots/spaces
  u = u.replace(/[^a-z0-9_-]/g, ""); // allowed chars
  u = u.replace(/[-_]{2,}/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return u.slice(0, 30); // max 30
}

// 3–30 chars; start/end alnum; a-z 0-9 - _
export function isUsernameFormatValid(u = "") {
  return /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(u) && !RESERVED.has(u);
}
