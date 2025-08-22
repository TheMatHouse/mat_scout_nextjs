// app/robots.js
export default function robots() {
  const base = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";
  const allowIndexing = process.env.ALLOW_INDEXING === "true";

  if (!allowIndexing) {
    // Staging / preview: block everything
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: base,
    };
  }

  // Production: allow public pages, block private areas
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // hard block sensitive/private routes
      { userAgent: "*", disallow: ["/dashboard", "/admin", "/api"] },
      // optionally keep team internals private
      {
        userAgent: "*",
        disallow: [
          "/team",
          "/teams/*/members",
          "/teams/*/settings",
          "/teams/*/scouting-reports",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
