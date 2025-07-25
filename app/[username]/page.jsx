import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import UserProfileClient from "@/components/profile/UserProfileClient";

export async function generateMetadata({ params }) {
  await connectDB();
  const member = await User.findOne({ username: params.username }); // Assuming same model

  if (!member || !member.allowPublic) {
    return {
      title: "Family Profile Not Found | MatScout",
      description: "The profile you are looking for does not exist.",
    };
  }

  const title = `${member.firstName} ${member.lastName} | MatScout`;
  const description = `Explore ${member.firstName}'s family grappling profile on MatScout.`;

  const ogImage = `${
    process.env.NEXT_PUBLIC_DOMAIN
  }/api/og?type=family&name=${encodeURIComponent(
    `${member.firstName} ${member.lastName}`
  )}&username=${encodeURIComponent(
    member.username
  )}&avatar=${encodeURIComponent(member.avatar || "/default-avatar.png")}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_DOMAIN}/family/${params.username}`,
    },
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_DOMAIN}/family/${params.username}`,
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

export default async function UserProfilePage({ params }) {
  await connectDB();
  const user = await User.findOne({ username: params.username });

  export default async function UserProfilePage({ params }) {
  const { username } = await params; // ✅ unwrap promise

  return (
    <UserProfileClient
      username={username}
    />
  );
}
