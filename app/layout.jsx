"use client";
export const dynamic = "force-dynamic";
import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import { UserProvider } from "@/context/UserContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const showSidebar =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/teams") ||
    /^\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/family/");

  useEffect(() => {
    if (params.get("error") === "forbidden") {
      toast.error("You are not authorized to access that page.");
    }
  }, [params]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
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
            <Header />

            <div className="flex flex-1">
              {showSidebar && (
                <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground">
                  <AuthenticatedSidebar />
                </aside>
              )}
              <main className="flex-1">{children}</main>
            </div>

            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
