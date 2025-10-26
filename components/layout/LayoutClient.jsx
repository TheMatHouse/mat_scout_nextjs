// components/layout/LayoutClient.jsx
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import AuthenticatedSidebar from "@/components/layout/AuthenticatedSidebar";

/**
 * LayoutClient
 * - Handles whether a sidebar should be shown.
 * - Prevents layout shift on public pages.
 */
export default function LayoutClient({ children }) {
  const pathname = usePathname() || "/";

  // Adjust these prefixes to match routes that should display the sidebar.
  const needsSidebar = useMemo(() => {
    return (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/teams") ||
      pathname.startsWith("/family")
    );
  }, [pathname]);

  // Width of your fixed sidebar on large screens
  const SIDEBAR_WIDTH = 280; // px

  return (
    <div
      className={[
        "flex-1 w-full min-w-0 overflow-x-clip",
        needsSidebar ? `lg:pl-[${SIDEBAR_WIDTH}px]` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Sidebar only visible when needed */}
      {needsSidebar && (
        <div className="hidden lg:block fixed left-0 top-16 bottom-0 w-[280px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30">
          <AuthenticatedSidebar />
        </div>
      )}

      {/* Page content */}
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
