import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserProfileClient from "@/components/profile/UserProfileClient";

// ✅ Generate dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const { username } = await params; // Ensure params is awaited

  await connectDB();
  const member = await User.findOne({ username });

  if (!member || !member.allowPublic) {
    return {
      title: "Profile Not Found | MatScout",
      description:
        "The profile you are looking for does not exist or is private.",
    };
  }

  const title = `${member.firstName} ${member.lastName} | MatScout`;
  const description = `View ${member.firstName}'s grappling profile on MatScout. Explore stats, teams, and more.`;

  const ogImage = `${
    process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
  }/api/og?type=user&name=${encodeURIComponent(
    `${member.firstName} ${member.lastName}`
  )}&username=${encodeURIComponent(
    member.username
  )}&avatar=${encodeURIComponent(member.avatar || "/default-avatar.png")}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/${username}`,
    },
    openGraph: {
      title,
      description,
      url: `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/${username}`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ✅ Render user profile page
export default async function UserProfilePage({ params }) {
  const { username } = await params; // Fix async params issue

  await connectDB();
  const user = await User.findOne({ username });

  if (!user || !user.allowPublic) {
    return (
      <div className="w-full flex justify-center py-20">
        <h1 className="text-3xl font-bold text-red-500">Profile Not Found</h1>
      </div>
    );
  }

  return (
    <UserProfileClient
      username={username}
      initialData={JSON.parse(JSON.stringify(user))}
    />
  );
}
