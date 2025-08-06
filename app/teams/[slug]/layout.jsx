"use client";

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
    /^\/[^/]+$/.test(pathname) || // Single segment, like /username
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
      <body className="min-h-screen flex flex-col bg-[#101630] text-white">
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
            {/* ✅ HEADER */}
            <Header className="border-b border-border" />

            {/* ✅ MAIN WRAPPER */}
            <div className="flex flex-1 min-h-0">
              {showSidebar && (
                <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground">
                  <div className="flex flex-col w-full h-full">
                    <AuthenticatedSidebar />
                  </div>
                </aside>
              )}

              <main className="flex-1 flex flex-col">{children}</main>
            </div>

            {/* ✅ FOOTER */}
            <Footer />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
