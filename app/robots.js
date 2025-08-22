// app/robots.js
export const dynamic = "force-dynamic"; // ensure it's computed per-request

function siteHost() {
  const site =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    "https://matscout.com";
  return site.replace(/^https?:\/\//, ""); // Host: must not include protocol
}

export default function robots() {
  // IMPORTANT: bracket access avoids build-time inlining
  const allow =
    (process.env["ALLOW_INDEXING"] || "").trim().toLowerCase() === "true";
  const host = siteHost();

  if (!allow) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host,
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
    host,
    sitemap: `https://${host}/sitemap.xml`,
  };
}
