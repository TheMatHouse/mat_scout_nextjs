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

/** ---------- Default SEO / Open Graph ---------- */
const BASE = process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com";
const OG_IMAGE = new URL("/default-og.png", BASE).toString();

export const metadata = {
  metadataBase: new URL(BASE),
  title: { default: "MatScout", template: "%s · MatScout" },
  description:
    "MatScout helps teams manage rosters, scout opponents, and share match reports.",
  openGraph: {
    type: "website",
    siteName: "MatScout",
    url: "/",
    title: "MatScout",
    description: "Manage teams, scout opponents, and share match reports.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "MatScout" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MatScout",
    description: "Manage teams, scout opponents, and share match reports.",
    images: [OG_IMAGE],
  },
  alternates: { canonical: "/" },
  // keep or remove; FB uses the property tag we added in app/head.jsx
  other: { "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "" },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  // Use either NEXT_PUBLIC_FACEBOOK_APP_ID (preferred) or fall back to FACEBOOK_CLIENT_ID if set
  const FB_APP_ID =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.FACEBOOK_CLIENT_ID ||
    "";

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Perf preconnects */}
        <link
          rel="dns-prefetch"
          href="https://res.cloudinary.com"
        />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href="https://lh3.googleusercontent.com"
        />
        <link
          rel="preconnect"
          href="https://lh3.googleusercontent.com"
          crossOrigin=""
        />
        <link
          rel="dns-prefetch"
          href="https://graph.facebook.com"
        />
        <link
          rel="preconnect"
          href="https://graph.facebook.com"
          crossOrigin=""
        />

        {/* -- explicit Open Graph for the homepage -- */}
        <meta
          property="og:type"
          content="website"
        />
        <meta
          property="og:title"
          content="MatScout – Your Ultimate Grappling Hub"
        />
        <meta
          property="og:description"
          content="Track, scout, and manage grappling athletes across Judo, BJJ, and Wrestling with MatScout."
        />
        <meta
          property="og:url"
          content={BASE}
        />
        <meta
          property="og:image"
          content={OG_IMAGE}
        />
        <meta
          property="og:image:width"
          content="1200"
        />
        <meta
          property="og:image:height"
          content="630"
        />

        {/* Facebook App ID (must be set via env) */}
        {FB_APP_ID ? (
          <meta
            property="fb:app_id"
            content={FB_APP_ID}
          />
        ) : null}
      </head>

      <body className="font-sans flex flex-col min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* 🔹 First-party analytics: send beacons on initial load & route changes */}
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
