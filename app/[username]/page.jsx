// app/[username]/page.jsx
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import "@/models/matchReportModel";
import UserProfileClient from "@/components/profile/UserProfileClient";

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function generateMetadata({ params }) {
  const { username } = await params;
  await connectDB();

  const member = await User.findOne({
    username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  }).lean();

  if (!member) {
    return {
      title: "Profile Not Found · MatScout",
      description: "The profile you are looking for does not exist.",
    };
  }

  const title =
    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
    member.username;
  const description = `View ${
    member.firstName || member.username
  }'s grappling profile on MatScout.`;

  // only setting the <title> and meta description
  // inherits all OG/Twitter tags from root layout
  return {
    title: `${title} · MatScout`,
    description,
  };
}

const UserProfilePage = async ({ params }) => {
  const { username } = await params;
  await connectDB();

  const user = await User.findOne({
    username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
  }).lean();

  if (!user) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let isMyProfile = false;
  if (token) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      if (payload?.userId === String(user._id)) {
        isMyProfile = true;
      }
    } catch {}
  }

  const isPublic = user.allowPublic === true || user.allowPublic === "Public";

  if (!isMyProfile && !isPublic) {
    return (
      <div className="w-full flex justify-center py-20">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
          This profile is private.
        </h1>
      </div>
    );
  }

  return (
    <main className="relative w-full no-x-overflow">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <UserProfileClient
          username={user.username}
          isMyProfile={isMyProfile}
          userId={String(user._id)}
        />
      </section>
    </main>
  );
};

export default UserProfilePage;
