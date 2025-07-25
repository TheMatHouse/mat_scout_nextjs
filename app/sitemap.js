import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

export default async function sitemap() {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  // Connect to DB
  await connectDB();

  // Get public user profiles
  const users = await User.find({ allowPublic: true }, "username updatedAt");

  // Static pages
  const staticPages = [
    { url: `${domain}/`, lastModified: new Date() },
    { url: `${domain}/about`, lastModified: new Date() },
    { url: `${domain}/features`, lastModified: new Date() },
    { url: `${domain}/contact`, lastModified: new Date() },
  ];

  // User profile pages
  const userPages = users.map((user) => ({
    url: `${domain}/${user.username}`,
    lastModified: user.updatedAt || new Date(),
    changefreq: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...userPages];
}
