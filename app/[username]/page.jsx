import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserProfileClient from "@/components/profile/UserProfileClient";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

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

  const title = `${member.firstName} ${member.lastName} | MatScout`;
  const description = `View ${member.firstName}'s grappling profile on MatScout.`;

  return {
    title,
    description,
  };
}

export default async function UserProfilePage({ params }) {
  const { username } = await params;

  await connectDB();

  const user = await User.findOne({ username })
    .populate("userStyles")
    .populate("matchReports")
    .lean();

  if (!user) {
    notFound(); // ✅ Real 404 if user not found
  }

  // ✅ Determine logged-in user
  const token = (await cookies()).get("token")?.value;
  let isMyProfile = false;
  if (token) {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    if (payload?.userId === user._id.toString()) {
      isMyProfile = true;
    }
  }

  if (!isMyProfile && !user.allowPublic) {
    return (
      <div className="w-full flex justify-center py-20">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
          This profile is private.
        </h1>
      </div>
    );
  }

  return (
    <UserProfileClient
      username={username}
    />
  );
}
