import FeaturesClient from "./FeaturesClient";

export const metadata = {
  title: "Features – MatScout | Grappling Analytics for Coaches & Athletes",
  description:
    "Explore the powerful features of MatScout: team management, performance tracking, match analysis, and more for grapplers and coaches.",
  alternates: {
    canonical: `${
      process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
    }/features`,
  },
  openGraph: {
    title: "Features – MatScout",
    description:
      "See what MatScout offers for grapplers: team management, match analysis, performance tracking, and more.",
    url: `${process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"}/features`,
    images: [
      {
        url: `${
          process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
        }/default-og.png`,
        width: 1200,
        height: 630,
        alt: "MatScout Features",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Features – MatScout",
    description:
      "Features for grapplers and coaches: match tracking, analytics, and team management.",
    images: [
      `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/default-og.png`,
    ],
  },
};

export default function FeaturesPage() {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MatScout",
    operatingSystem: "Web",
    applicationCategory: "Sports Analytics",
    url: `${domain}`,
    description:
      "MatScout is a grappling performance tracking and analytics platform for athletes and coaches. Track matches, analyze performance, and manage teams.",
    image: `${domain}/default-og.png`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available with premium upgrades.",
    },
    featureList: [
      "Performance Tracking",
      "Team Management",
      "Match Analysis",
      "Data-Driven Insights",
      "Secure and Private Platform",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "45",
    },
    author: {
      "@type": "Organization",
      name: "MatScout",
      url: `${domain}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FeaturesClient />
    </>
  );
}
