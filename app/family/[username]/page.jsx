import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyProfileClient from "@/components/profile/FamilyProfileClient";

export async function generateMetadata({ params }) {
  const { username } = await params; // ✅ Await params
  await connectDB();
  const member = await User.findOne({ username });

  if (!member) {
    return {
      title: "Family Member Not Found | MatScout",
      description: "This family member profile does not exist.",
    };
  }

  const title = `${member.firstName} ${member.lastName} (Family) | MatScout`;
  const description = `View ${member.firstName}'s family profile on MatScout. See teams, stats, and more.`;
  const image = member.avatar || "/default-avatar.png";

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_DOMAIN}/family/${username}`,
    },
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_DOMAIN}/family/${username}`,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function FamilyProfilePage({ params }) {
  const { username } = await params; // ✅ Await params
  await connectDB();
  const member = await User.findOne({ username });

  return (
    <FamilyProfileClient
      username={username}
      initialData={member ? JSON.parse(JSON.stringify(member)) : null}
    />
  );
}
