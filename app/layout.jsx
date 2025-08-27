import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/context/UserContext";
import LayoutClient from "@/components/layout/LayoutClient";

// ⬇️ NEW: first-party analytics beacon
import AnalyticsBeacon from "@/components/analytics/AnalyticsBeacon";

/** ---------- Default SEO / Open Graph ---------- */
export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com"
  ),
  title: {
    default: "MatScout",
    template: "%s · MatScout",
  },
  description:
    "MatScout helps teams manage rosters, scout opponents, and share match reports.",
  openGraph: {
    type: "website",
    siteName: "MatScout",
    url: "/",
    title: "MatScout",
    description: "Manage teams, scout opponents, and share match reports.",
    images: [
      {
        url: "/og/matscout-og.png",
        width: 1200,
        height: 630,
        alt: "MatScout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MatScout",
    description: "Manage teams, scout opponents, and share match reports.",
    images: ["/og/matscout-og.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Speed up first image bytes */}
        <link
          rel="dns-prefetch"
          href="https://res.cloudinary.com"
        />
        <link
          rel="preconnect"
          href="https://res.cloudinary.com"
          crossOrigin=""
        />
        {/* Optional: avatars from Google & Facebook */}
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
