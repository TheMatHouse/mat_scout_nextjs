// components/layout/ChromeGate.jsx
"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";

// adjust paths if needed
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LayoutClient from "@/components/layout/LayoutClient";

/**
 * ChromeGate
 * - Minimal shell on /maintenance (no UserProvider/Header/Footer) to avoid auth/API fetches and JSON errors.
 * - Global chrome everywhere else (renders exactly once).
 */
export default function ChromeGate({ children }) {
  const pathname = usePathname() || "/";

  // 1) Minimal shell on /maintenance
  if (pathname === "/maintenance") {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <ToastContainer
          position="top-right"
          autoClose={5000}
        />
        <main className="flex-1 w-full">{children}</main>
      </ThemeProvider>
    );
  }

  // 2) Normal global chrome everywhere else
  return (
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
        <LayoutClient>
          {children}
          <Footer />
        </LayoutClient>
      </UserProvider>
    </ThemeProvider>
  );
}
