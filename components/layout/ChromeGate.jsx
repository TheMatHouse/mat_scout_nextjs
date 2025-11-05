// components/layout/ChromeGate.jsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "react-toastify";

// Adjust these imports if your paths differ
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LayoutClient from "@/components/layout/LayoutClient";

/**
 * ChromeGate responsibilities:
 * 1) Minimal shell on /maintenance (no UserProvider/Header/Footer) to prevent auth/API JSON errors.
 * 2) Full chrome everywhere else (ThemeProvider, Toasts, UserProvider, Header, LayoutClient, Footer).
 * 3) Client-side guard: if maintenance/updating is ON, redirect to /maintenance on SPA navigations.
 *    - Skips redirect for /admin* (so admins can toggle it off).
 *    - Honors bypass cookie ms_maintenance_bypass=1.
 */
const ChromeGate = ({ children }) => {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // -------- Client-side maintenance guard for SPA navigations --------
  useEffect(() => {
    // Skip guard on maintenance page itself
    if (pathname === "/maintenance") return;

    // Allow admins to access admin surfaces during maintenance
    if (pathname.startsWith("/admin")) return;

    // Honor bypass cookie set via ?bypass_maintenance=1
    if (
      typeof document !== "undefined" &&
      document.cookie.includes("ms_maintenance_bypass=1")
    ) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/public/maintenance", { cache: "no-store" });
        const ct = r.headers.get("content-type") || "";
        const data = ct.includes("application/json")
          ? await r.json().catch(() => null)
          : null;
        if (!data || cancelled) return;

        const mode = String(data.maintenanceMode || "off");
        if (mode !== "off") {
          const reason = mode === "updating" ? "updating" : "maintenance";
          router.replace(`/maintenance?reason=${encodeURIComponent(reason)}`);
        }
      } catch {
        // Fail open on errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // -------- Minimal shell on /maintenance --------
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

  // -------- Normal global chrome everywhere else --------
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
};

export default ChromeGate;
