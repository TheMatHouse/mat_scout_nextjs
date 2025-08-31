// app/teams/[slug]/page.jsx
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamPageClient from "@/components/teams/TeamPageClient";

function strip(u) {
  return u ? u.replace(/\/+$/, "") : u;
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
  const { slug } = params;
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  const DEFAULT_OG = absUrl("/default-og.png");

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
        images: [
          {
            url: DEFAULT_OG,
            secureUrl: DEFAULT_OG,
            width: 1200,
            height: 630,
            alt: "MatScout",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [DEFAULT_OG], // Twitter uses just the default
      },
    };
  }

  const title = `${team.teamName} · MatScout`;
  const description = `Discover ${team.teamName}'s profile on MatScout.`;

  const logo = team.logoURL
    ? team.logoURL.startsWith("http")
      ? team.logoURL
      : absUrl(team.logoURL)
    : "";

  // Build optional second image from /api/og (default remains first)
  const images = [
    {
      url: DEFAULT_OG,
      secureUrl: DEFAULT_OG,
      width: 1200,
      height: 630,
      alt: "MatScout",
    },
  ];

  if (logo) {
    const og = new URL("/api/og", SITE_URL);
    og.searchParams.set("type", "team");
    og.searchParams.set("name", team.teamName || "MatScout");
    og.searchParams.set("avatar", logo);
    // lightweight cache-buster if the logo changes:
    if (team.logoId) og.searchParams.set("v", team.logoId);
    images.push({
      url: og.toString(),
      width: 1200,
      height: 630,
      alt: `${team.teamName} on MatScout`,
    });
  }

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
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG], // force the default on Twitter
    },
  };
}

export default async function TeamPage({ params }) {
  const { slug } = params;
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  return (
    <TeamPageClient
      slug={slug}
      initialData={team ? JSON.parse(JSON.stringify(team)) : null}
    />
  );
}
