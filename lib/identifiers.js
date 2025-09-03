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

// 3–30 chars, lowercase, a–z 0–9 - _ ; must start/end alnum
export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/;

// Lowercase; strip anything not a–z 0–9 - _ ; collapse/trim dashes/underscores; max 30
export function sanitizeUsername(input = "") {
  let u = String(input).toLowerCase();

  // remove anything you don't allow (drops '.', '@', spaces, etc.)
  u = u.replace(/[^a-z0-9_-]/g, "");

  // collapse consecutive separators and trim at ends
  u = u.replace(/[-_]{2,}/g, "-").replace(/^[-_]+|[-_]+$/g, "");

  // max length 30
  return u.slice(0, 30);
}

// Validate the *sanitized* version so callers can pass raw input safely
export function isUsernameFormatValid(input = "") {
  const u = sanitizeUsername(input);
  return USERNAME_REGEX.test(u) && !RESERVED.has(u);
}
