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
  const { slug } = await params; // keep your pattern
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  if (!team) {
    const title = "Team Not Found · MatScout";
    const description = "The team you are looking for does not exist.";
    const fallback = absUrl("/default-og.png"); // no ?v=4

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
        images: [{ url: fallback, width: 1200, height: 630, alt: "MatScout" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [fallback],
      },
    };
  }

  const title = `${team.teamName} · MatScout`;
  const description = `Discover ${team.teamName}'s profile on MatScout.`;

  // Build a single, absolute OG image URL.
  // If you want the dynamic /api/og, make every param absolute too.
  const avatar = team.logoURL
    ? team.logoURL.startsWith("http://") || team.logoURL.startsWith("https://")
      ? team.logoURL
      : absUrl(team.logoURL) // make relative logos absolute
    : absUrl("/default-team.png");

  const ogImage = new URL("/api/og", SITE_URL);
  ogImage.searchParams.set("type", "team");
  ogImage.searchParams.set("name", team.teamName || "");
  ogImage.searchParams.set("avatar", avatar);

  const ogUrl = ogImage.toString();

  return {
    title,
    description,
    alternates: {
      canonical: absUrl(`/teams/${slug}`),
    },
    openGraph: {
      type: "website",
      siteName: "MatScout",
      title,
      description,
      url: absUrl(`/teams/${slug}`),
      images: [
        {
          url: ogUrl, // single, absolute source of truth
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
  const { slug } = await params;
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug });

  return (
    <TeamPageClient
      slug={slug}
      initialData={team ? JSON.parse(JSON.stringify(team)) : null}
    />
  );
}
