import AboutClient from "./AboutClient";

export const metadata = {
  title: "About – MatScout | Grappling Analytics for Coaches & Athletes",
  description:
    "Learn about MatScout, the platform built for grapplers, coaches, and fans. Track performance, manage teams, and stay connected to the sport you love.",
  alternates: {
    canonical: `${
      process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
    }/about`,
  },
  openGraph: {
    title: "About – MatScout",
    description:
      "Discover who we are and why MatScout is the go-to platform for grapplers and coaches.",
    url: `${process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"}/about`,
    images: [
      {
        url: `${
          process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
        }/default-og.png`,
        width: 1200,
        height: 630,
        alt: "About MatScout",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About – MatScout",
    description:
      "MatScout is your platform for tracking performance, managing teams, and growing the grappling community.",
    images: [
      `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/default-og.png`,
    ],
  },
};

export default function AboutPage() {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MatScout",
    url: domain,
    logo: `${domain}/default-og.png`,
    sameAs: [
      "https://facebook.com/matscout",
      "https://instagram.com/matscout",
      "https://twitter.com/matscout",
    ],
    description:
      "MatScout is a performance tracking and analytics platform for grappling athletes and coaches.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@matscout.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AboutClient />
    </>
  );
}
