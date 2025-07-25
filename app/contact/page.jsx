import ContactClient from "./ContactClient";

export const metadata = {
  title: "Contact Us – MatScout",
  description:
    "Get in touch with the MatScout team. Questions, feedback, or issues? We’re here to help.",
  alternates: {
    canonical: `${
      process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
    }/contact`,
  },
  openGraph: {
    title: "Contact Us – MatScout",
    description:
      "Have a question, feedback, or need assistance? Contact MatScout today.",
    url: `${process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"}/contact`,
    images: [
      {
        url: `${
          process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
        }/default-og.png`,
        width: 1200,
        height: 630,
        alt: "Contact MatScout",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact MatScout",
    description:
      "Get in touch with the MatScout team for questions, feedback, or issues.",
    images: [
      `${
        process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
      }/default-og.png`,
    ],
  },
};

export default function ContactPage() {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    mainEntity: {
      "@type": "Organization",
      name: "MatScout",
      url: domain,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support",
        email: "support@matscout.com",
        areaServed: "US",
        availableLanguage: ["English"],
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactClient />
    </>
  );
}
