export function customMetaDataGenerator({
  title,
  description = "MatScout.com is your premier grappling site, offering comprehensive athlete scouting tools. Whether you're scouting at the international level or refining local talent, MatScout helps you track athletes and competitors' performance conveniently.",
  canonicalUrl = "https://matscout.com",
  ogType = "website",
  keywords = [
    "MatScout",
    "grappling site",
    "athlete scouting",
    "international scouting",
    "local athlete scouting",
    "athlete performance tracking",
    "grappling competition",
    "judo",
    "brazilian jiu jitsu",
    "bjj",
    "wrestling",
    "grappling",
  ],
  ogImage = "https://matscout.com/images/mat_scout_logo.png",
  twitterCard = "summary_large_image",
}) {
  // Create Site Title
  const siteTitle = "MatScout";
  const fullTitle = `${title} | ${siteTitle}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title: fullTitle,
      description,
      type: ogType,
      url: canonicalUrl,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
