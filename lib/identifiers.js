// lib/identifiers.js

// Slugs/usernames you never want to allow
export const RESERVED = new Set([
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

// ✅ Only lowercase letters and numbers, 3–30 chars
export const USERNAME_REGEX = /^[a-z0-9]{3,30}$/;

// Lowercase; strip anything not a–z or 0–9; max length 30
export function sanitizeUsername(input = "") {
  let u = String(input).toLowerCase();
  u = u.replace(/[^a-z0-9]/g, "");
  return u.slice(0, 30);
}

// Validate the *sanitized* version
export function isUsernameFormatValid(input = "") {
  const u = sanitizeUsername(input);
  return USERNAME_REGEX.test(u) && !RESERVED.has(u);
}
