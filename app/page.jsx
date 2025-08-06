// app/page.jsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server"; // ✅ Updated import
import HomePage from "./home/page_temp";

export const metadata = {
  title: "MatScout – Track, Scout, and Manage Grappling Athletes",
  description:
    "MatScout is your ultimate grappling hub. Analyze matches, manage teams, and grow together across Judo, BJJ, and Wrestling.",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com",
  },
  openGraph: {
    title: "MatScout – Your Ultimate Grappling Hub",
    description:
      "Track, scout, and manage grappling athletes across Judo, BJJ, and Wrestling with MatScout.",
    url: process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com",
    images: [
      {
        url:
          (process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com") +
          "/default-og.png",
        width: 1200,
        height: 630,
        alt: "MatScout Homepage",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MatScout – Track, Scout, and Manage Grappling Athletes",
    description: "Manage teams, analyze matches, and grow with MatScout.",
    images: [
      (process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com") +
        "/default-og.png",
    ],
  },
};

export default async function Home() {
  const user = await getCurrentUser(); // ✅ Server-safe

  if (user) {
    redirect("/dashboard");
  }

  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "MatScout",
        url: domain,
        potentialAction: {
          "@type": "SearchAction",
          target: `${domain}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "MatScout",
        url: domain,
        logo: `${domain}/default-og.png`,
        sameAs: [
          "https://facebook.com/matscout",
          "https://instagram.com/matscout",
          "https://twitter.com/matscout",
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
