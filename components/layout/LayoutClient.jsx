// components/layout/LayoutClient.jsx
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";

/**
 * LayoutClient
 * - Shows/hides the sidebar based on route.
 * - Reserves space for the sidebar so content AND footer never sit underneath it.
 * - Sidebar is FIXED (like before). Content uses left padding to avoid overlap.
 */
function LayoutClient({ children }) {
  const pathname = usePathname() || "/";

  // Routes that should display the authenticated sidebar
  const needsSidebar = useMemo(() => {
    return (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/teams") ||
      pathname.startsWith("/family")
    );
  }, [pathname]);

  return (
    <div
      className={[
        "flex-1 flex flex-col w-full min-w-0 overflow-x-clip",
        needsSidebar ? "lg:pl-[280px]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Sidebar (fixed, like before) */}
      {needsSidebar && (
        <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-[280px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30">
          <AuthenticatedSidebar />
        </div>
      )}

      {/* Main content + footer (passed from app/layout) */}
      <main className="flex-1 w-full min-w-0 flex flex-col">{children}</main>
    </div>
  );
}

export default LayoutClient;
