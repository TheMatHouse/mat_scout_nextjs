// app/sitemap.xml/route.js
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

export async function GET() {
  await connectDB();

  // Fetch public user profiles and teams
  const users = await User.find({ allowPublic: true }, "username updatedAt");
  const teams = await Team.find({}, "teamSlug updatedAt");

  const staticPages = [
    { loc: `${BASE_URL}/`, priority: 1.0 },
    { loc: `${BASE_URL}/features`, priority: 0.9 },
    { loc: `${BASE_URL}/about`, priority: 0.8 },
    { loc: `${BASE_URL}/contact`, priority: 0.8 },
  ];

  // Combine URLs
  const urls = [
    ...staticPages,
    ...users.map((user) => ({
      loc: `${BASE_URL}/${user.username}`,
      lastmod: user.updatedAt?.toISOString() || new Date().toISOString(),
      priority: 0.7,
    })),
    ...teams.map((team) => ({
      loc: `${BASE_URL}/teams/${team.teamSlug}`,
      lastmod: team.updatedAt?.toISOString() || new Date().toISOString(),
      priority: 0.7,
    })),
  ];

  // Build XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: { "Content-Type": "application/xml" },
  });
}
