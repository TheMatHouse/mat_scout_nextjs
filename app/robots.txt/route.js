// app/robots.txt/route.js
const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";

export async function GET() {
  const content = `
User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

  return new Response(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
