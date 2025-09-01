// app/[username]/page.jsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
// Ensure referenced schemas are registered for populate on this page too:
import "@/models/userStyleModel";
import "@/models/matchReportModel";

import UserProfileClient from "@/components/profile/UserProfileClient";

export async function generateMetadata({ params }) {
  const { username } = await params;

  await connectDB();
  const member = await User.findOne({ username }).lean();

  if (!member) {
    return {
      title: "Profile Not Found | MatScout",
      description: "The profile you are looking for does not exist.",
    };
  }

  const title =
    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
    member.username;
  const description = `View ${
    member.firstName || member.username
  }'s grappling profile on MatScout.`;

  return {
    title: `${title} | MatScout`,
    description,
  };
}

export default async function UserProfilePage({ params }) {
  const { username } = await params;

  await connectDB();

  // Fetch minimal doc here just to decide visibility & 404
  const user = await User.findOne({ username }).lean();

  if (!user) {
    // ✅ Only 404 if user truly doesn't exist
    notFound();
  }

  // Determine if viewer is the owner
  const token = (await cookies()).get("token")?.value;
  let isMyProfile = false;
  if (token) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      if (payload?.userId === String(user._id)) {
        isMyProfile = true;
      }
    } catch {
      // ignore bad/expired token
    }
  }

  // If private and not owner, render the private message (no 404)
  if (!isMyProfile && !user.allowPublic) {
    return (
      <div className="w-full flex justify-center py-20">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
          This profile is private.
        </h1>
      </div>
    );
  }

  // Let the client component fetch the rich profile data via the API route
  return <UserProfileClient username={username} />;
}
