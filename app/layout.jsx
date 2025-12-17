// app/layout.jsx
import "@/app/globals.css";
import "react-toastify/dist/ReactToastify.css";

import dynamic from "next/dynamic";
import ChromeGate from "@/components/layout/ChromeGate";

export const dynamic = "force-dynamic";

/** Helpers */
const stripTrailingSlash = (url) => (url ? url.replace(/\/+$/, "") : url);

const SITE_URL =
  stripTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL) ||
  stripTrailingSlash(process.env.NEXT_PUBLIC_DOMAIN) ||
  "https://matscout.com";

const absUrl = (path = "/") => {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
};

const DEFAULT_OG = absUrl("/default-og.png");

/** Analytics (CLIENT ONLY, NON-FATAL) */
const AnalyticsBeacon = dynamic(
  () => import("@/components/analytics/AnalyticsBeacon"),
  { ssr: false }
);

/** Metadata */
export async function generateMetadata() {
  const base = new URL(SITE_URL);
  const baseTitle = "MatScout";
  const baseDesc =
    "MatScout helps teams manage rosters, scout opponents, and share match reports.";

  return {
    metadataBase: base,
    title: { default: baseTitle, template: "%s · MatScout" },
    description: baseDesc,
    openGraph: {
      type: "website",
      siteName: "MatScout",
      url: absUrl("/"),
      title: baseTitle,
      description: baseDesc,
      images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: "MatScout" }],
    },
    twitter: {
      card: "summary_large_image",
      title: baseTitle,
      description: baseDesc,
      images: [DEFAULT_OG],
    },
    alternates: { canonical: absUrl("/") },
  };
}

/** Layout */
const RootLayout = ({ children }) => {
  const FB_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FB_APP_ID ||
    process.env.FB_APP_ID ||
    "";

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {FB_APP_ID ? (
          <meta
            property="fb:app_id"
            content={FB_APP_ID}
          />
        ) : null}

        {/* Google reCAPTCHA v3 */}
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          async
          defer
        />
      </head>

      <body className="font-sans flex flex-col min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] w-full overflow-x-hidden">
        {/* ✅ Analytics is now client-only and cannot crash renders */}
        <AnalyticsBeacon />

        <main className="flex-1 flex flex-col">
          <ChromeGate>{children}</ChromeGate>
        </main>
      </body>
    </html>
  );
};

export default RootLayout;
