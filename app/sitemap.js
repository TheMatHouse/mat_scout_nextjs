// app/sitemap.js
export const runtime = "nodejs";
export const revalidate = 300; // regenerate every hour (lower if you want faster pickup)

import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

export default async function sitemap() {
  await connectDB();

  const BASE = (
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://matscout.com"
  ).replace(/\/$/, ""); // strip trailing slash

  // Only include users who opted into public profiles
  const users = await User.find(
    { allowPublic: true },
    { username: 1, updatedAt: 1 }
  ).lean();

  // Static routes
  const staticPages = [
    { url: `${BASE}/`, lastModified: new Date() },
    { url: `${BASE}/about`, lastModified: new Date() },
    { url: `${BASE}/features`, lastModified: new Date() },
    { url: `${BASE}/contact`, lastModified: new Date() },
  ];

  // Public user profiles
  const userPages = users
    .filter((u) => u.username)
    .map((u) => ({
      url: `${BASE}/${encodeURIComponent(u.username)}`,
      lastModified: u.updatedAt || new Date(),
      changefreq: "weekly",
      priority: 0.7,
    }));

  return [...staticPages, ...userPages];
}
