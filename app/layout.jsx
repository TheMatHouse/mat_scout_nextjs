// app/layout.jsx
import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/context/UserContext";
import LayoutClient from "@/components/layout/LayoutClient";

// ⬇️ first-party analytics beacon
import AnalyticsBeacon from "@/components/analytics/AnalyticsBeacon";

// Keep pages dynamic if you rely on per-request headers/cookies
export const dynamic = "force-dynamic";

/** ---------- Helpers ---------- */
function stripTrailingSlash(url) {
  return url ? url.replace(/\/+$/, "") : url;
}

const SITE_URL =
  stripTrailingSlash(process.env.NEXT_PUBLIC_BASE_URL) ||
  stripTrailingSlash(process.env.NEXT_PUBLIC_DOMAIN) ||
  "https://matscout.com";

function absUrl(path = "/") {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

const DEFAULT_OG = absUrl("/default-og.png");

/** ---------- Centralized Metadata ---------- */
export async function generateMetadata() {
  // Prefer a single env name in production. Keep both for safety during transition.
  const FB_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FB_APP_ID ||
    process.env.FB_APP_ID ||
    "";

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
      images: [
        {
          url: DEFAULT_OG,
          width: 1200,
          height: 630,
          alt: "MatScout",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: baseTitle,
      description: baseDesc,
      images: [DEFAULT_OG],
    },

    alternates: {
      canonical: absUrl("/"),
    },

    // Emit fb:app_id only if present to avoid "missing/undefined" issues
    ...(FB_APP_ID ? { other: { "fb:app_id": FB_APP_ID } } : {}),
  };
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      {/* No manual <meta> tags. Next will render everything from generateMetadata(). */}
      <body className="font-sans flex flex-col min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <AnalyticsBeacon />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ToastContainer
            position="top-right"
            autoClose={5000}
          />
          <UserProvider>
            <Header />
            <LayoutClient>{children}</LayoutClient>
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
