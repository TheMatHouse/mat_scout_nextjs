// components/layout/LayoutClient.jsx
"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * LayoutClient
 * - Scopes left padding for fixed sidebars to dashboard-like routes only.
 * - Prevents global left shift on public pages (e.g., /teams/[slug]).
 */
export default function LayoutClient({ children }) {
  const pathname = usePathname() || "/";

  // Adjust these prefixes to match routes that actually have a fixed sidebar.
  const needsSidebar = useMemo(() => {
    return (
      pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
      // add more prefixes if you truly have a sidebar there
    );
  }, [pathname]);

  // Width of your fixed sidebar on large screens (if any)
  const SIDEBAR_WIDTH = 280; // px

  return (
    <div
      className={[
        // base
        "flex-1 w-full min-w-0",
        // prevent accidental horizontal scroll
        "overflow-x-clip",
        // only reserve space for sidebar on large screens AND only on sidebar routes
        needsSidebar ? `lg:pl-[${SIDEBAR_WIDTH}px]` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Keep a neutral inner wrapper so pages can manage their own containers */}
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
}
