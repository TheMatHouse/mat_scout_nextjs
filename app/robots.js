export default function robots() {
  const base = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";
  const isStaging = base.includes("staging");

  if (isStaging) {
    // Block everything on staging
    return { rules: [{ userAgent: "*", disallow: "/" }], host: base };
  }

  // Production: block private areas only
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/dashboard", "/admin", "/api", "/teams", "/team"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
