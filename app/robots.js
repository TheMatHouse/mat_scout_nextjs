// app/robots.js
export const dynamic = "force-dynamic";

function siteHost() {
  const site =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    "https://matscout.com";
  // Robots “Host:” should not include protocol
  return site.replace(/^https?:\/\//, "");
}

export default function robots() {
  const allow = process.env.ALLOW_INDEXING === "true";
  const host = siteHost();

  if (!allow) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host, // e.g. matscout.com
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      {
        userAgent: "*",
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          "/team",
          "/teams/*/members",
          "/teams/*/settings",
          "/teams/*/scouting-reports",
        ],
      },
    ],
    host, // matscout.com
    sitemap: `https://${host}/sitemap.xml`,
  };
}
