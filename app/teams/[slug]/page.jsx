import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamPageClient from "@/components/teams/TeamPageClient";

export async function generateMetadata({ params }) {
  await connectDB();
  const team = await Team.findOne({ teamSlug: params.slug });

  if (!team) {
    return {
      title: "Team Not Found | MatScout",
      description: "The team you are looking for does not exist.",
    };
  }

  const title = `${team.teamName} | MatScout Team`;
  const description = `Discover ${team.teamName}'s profile, members, and achievements on MatScout.`;

  const ogImage = `${
    process.env.NEXT_PUBLIC_DOMAIN
  }/api/og?type=team&name=${encodeURIComponent(
    team.teamName
  )}&avatar=${encodeURIComponent(team.logoURL || "/default-team.png")}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_DOMAIN}/teams/${params.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_DOMAIN}/teams/${params.slug}`,
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

export default async function TeamPage({ params }) {
  await connectDB();
  const team = await Team.findOne({ teamSlug: params.slug });

  return (
    <TeamPageClient
      slug={params.slug}
      initialData={team ? JSON.parse(JSON.stringify(team)) : null}
    />
  );
}
