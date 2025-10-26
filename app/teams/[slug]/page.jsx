// app/teams/[slug]/page.jsx
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamPageClient from "@/components/teams/TeamPageClient";

function strip(url) {
  return url ? url.replace(/\/+$/, "") : url;
}
const SITE_URL =
  strip(process.env.NEXT_PUBLIC_BASE_URL) ||
  strip(process.env.NEXT_PUBLIC_DOMAIN) ||
  "https://matscout.com";

function absUrl(path = "/") {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params; // ✅ must await in Next 15
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  const defaultOG = absUrl("/default-og.png");

  if (!team) {
    const title = "Team Not Found · MatScout";
    const description = "The team you are looking for does not exist.";
    return {
      title,
      description,
      alternates: { canonical: absUrl(`/teams/${slug}`) },
      robots: { index: false, follow: false },
      openGraph: {
        type: "website",
        url: absUrl(`/teams/${slug}`),
        siteName: "MatScout",
        title,
        description,
        images: [{ url: defaultOG, width: 1200, height: 630, alt: "MatScout" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [defaultOG],
      },
    };
  }

  const title = `${team.teamName} · MatScout`;
  const description = `Discover ${team.teamName}'s profile on MatScout.`;

  // Always use default OG now (per your new rule)
  const ogUrl = defaultOG;

  return {
    title,
    description,
    alternates: { canonical: absUrl(`/teams/${slug}`) },
    openGraph: {
      type: "website",
      siteName: "MatScout",
      title,
      description,
      url: absUrl(`/teams/${slug}`),
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${team.teamName} on MatScout`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function TeamPage({ params }) {
  const { slug } = await params; // ✅ must await in Next 15
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  return (
    <TeamPageClient
      slug={slug}
      initialData={team ? JSON.parse(JSON.stringify(team)) : null}
    />
  );
}
