// app/robots.js
export const dynamic = "force-dynamic"; // compute per-request

function siteHost() {
  const site =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    "https://matscout.com";
  return site.replace(/^https?:\/\//, "");
}

export default function robots() {
  const allow =
    (process.env["ALLOW_INDEXING"] || "").trim().toLowerCase() === "true";
  const host = siteHost();

  // If indexing is off, block everyone.
  if (!allow) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host,
    };
  }

  return {
    rules: [
      // Explicitly allow major social scrapers (so they can fetch /teams/* pages)
      { userAgent: "facebookexternalhit", allow: ["/", "/teams/"] },
      { userAgent: "Facebot", allow: ["/", "/teams/"] },
      { userAgent: "Twitterbot", allow: ["/", "/teams/"] },
      { userAgent: "Slackbot", allow: ["/", "/teams/"] },
      { userAgent: "Discordbot", allow: ["/", "/teams/"] },
      { userAgent: "LinkedInBot", allow: ["/", "/teams/"] },

      // Default rule: allow site but hide sensitive areas from generic crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          // keep team info public, but hide members/settings/reports
          "/teams/*/members",
          "/teams/*/settings",
          "/teams/*/scouting-reports",
        ],
      },
    ],
    host,
    sitemap: `https://${host}/sitemap.xml`,
  };
}
