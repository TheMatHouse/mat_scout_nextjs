"use client";

import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";
import { UserProvider } from "@/context/UserContext";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const showSidebar = pathname.startsWith("/dashboard"); // Sidebar only on dashboard

  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
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
            {/* Header */}
            <Header className="border-b border-border" />

            {/* Main Content Wrapper */}
            <div className="flex flex-1 min-h-0">
              <aside className="hidden md:flex w-64 bg-sidebar-background text-sidebar-foreground">
                <div className="flex flex-col w-full h-full">
                  <AuthenticatedSidebar />
                </div>
              </aside>

              <main className="flex-1 px-4 py-6 md:px-8 md:py-10 bg-background text-foreground fade-in">
                {children}
              </main>
            </div>

            {/* Footer */}
            <Footer className="border-t border-border" />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
