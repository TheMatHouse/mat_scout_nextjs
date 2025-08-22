// app/robots.js
export const dynamic = "force-dynamic";

export default function robots() {
  const base = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";
  const allowIndexing = process.env.ALLOW_INDEXING === "true";

  if (!allowIndexing) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: base,
      // no sitemap on staging/preview
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/dashboard", "/admin", "/api"] },
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
    host: base,
    sitemap: `${base}/sitemap.xml`,
  };
}
