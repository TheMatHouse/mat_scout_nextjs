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
  const { slug } = params; // no need to await
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

  // Normalize avatar to absolute URL if present
  const normalizedAvatar = team.logoURL
    ? team.logoURL.startsWith("http://") || team.logoURL.startsWith("https://")
      ? team.logoURL
      : absUrl(team.logoURL)
    : null;

  // Prefer dynamic composite if we can prove it's an image for Facebot; otherwise fall back to default OG.
  let ogUrl = defaultOG;

  if (normalizedAvatar) {
    const apiOg = new URL("/api/og", SITE_URL);
    apiOg.searchParams.set("type", "team");
    apiOg.searchParams.set("name", team.teamName || "");
    apiOg.searchParams.set("avatar", normalizedAvatar);

    const candidate = apiOg.toString();

    try {
      const r = await fetch(candidate, {
        method: "HEAD",
        // Emulate Facebook so any conditional code/hotlink rules are exercised:
        headers: { "User-Agent": "facebookexternalhit/1.1" },
        cache: "no-store",
      });
      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.startsWith("image/")) {
        ogUrl = candidate;
      }
    } catch {
      // swallow — we'll keep defaultOG
    }
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
