import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import { UserProvider } from "@/context/UserContext";
// import MetaMaskErrorFilter from "@/components/MetaMaskErrorFilter";

export const metadata = {
  title: {
    default: "MatScout",
    template: "%s | MatScout", // Pages can override this
  },
  description:
    "Track, scout, and manage grappling athletes across Judo, BJJ, and Wrestling with MatScout.",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com",
  },
  openGraph: {
    title: "MatScout",
    description:
      "Track, scout, and manage grappling athletes across Judo, BJJ, and Wrestling.",
    url: process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com",
    siteName: "MatScout",
    images: [
      {
        url:
          (process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com") +
          "/default-og.png",
        width: 1200,
        height: 630,
        alt: "MatScout Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MatScout",
    description: "Track, scout, and manage grappling athletes.",
    images: [
      (process.env.NEXT_PUBLIC_DOMAIN || "https://matscout.com") +
        "/default-og.png",
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="font-roboto bg-background text-foreground">
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
            <div className="flex min-h-screen w-full">
              <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground border-r border-border">
                <AuthenticatedSidebar />
              </aside>
              <main className="flex-1 px-4 py-6 md:px-8 md:py-10 bg-background text-foreground">
                {children}
              </main>
            </div>
            <Footer />
          </UserProvider>
          {/* <MetaMaskErrorFilter /> ✅ Runs client-side */}
        </ThemeProvider>
      </body>
    </html>
  );
}
