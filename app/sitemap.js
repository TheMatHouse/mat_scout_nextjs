// app/sitemap.js
export const runtime = "nodejs";
export const revalidate = 300; // rebuild every 5 minutes

import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";

export default async function sitemap() {
  await connectDB();

  const BASE = (
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://matscout.com"
  ).replace(/\/+$/, ""); // strip trailing slashes

  // Static routes
  const staticPages = [
    { url: `${BASE}/`, lastModified: new Date() },
    { url: `${BASE}/about`, lastModified: new Date() },
    { url: `${BASE}/features`, lastModified: new Date() },
    { url: `${BASE}/contact`, lastModified: new Date() },
    {
      url: `${BASE}/teams`,
      lastModified: new Date(),
      changefreq: "daily",
      priority: 0.6,
    },
  ];

  // Public user profiles
  const users = await User.find(
    { allowPublic: true },
    { username: 1, updatedAt: 1 }
  ).lean();

  const userPages = users
    .filter((u) => u.username)
    .map((u) => ({
      url: `${BASE}/${encodeURIComponent(u.username)}`,
      lastModified: u.updatedAt || new Date(),
      changefreq: "weekly",
      priority: 0.7,
    }));

  // Team pages (public team info pages)
  const teams = await Team.find(
    { teamSlug: { $exists: true, $ne: "" } },
    { teamSlug: 1, updatedAt: 1 }
  ).lean();

  const teamPages = teams.map((t) => ({
    url: `${BASE}/teams/${encodeURIComponent(t.teamSlug)}`,
    lastModified: t.updatedAt || new Date(),
    changefreq: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...userPages, ...teamPages];
}
