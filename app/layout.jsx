import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/context/UserContext";
import LayoutClient from "@/components/layout/LayoutClient";

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
            {/* ✅ Header stays static */}
            <Header />

            {/* ✅ Client-side wrapper for sidebar + query params */}
            <LayoutClient>{children}</LayoutClient>

            {/* ✅ Footer stays static */}
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
