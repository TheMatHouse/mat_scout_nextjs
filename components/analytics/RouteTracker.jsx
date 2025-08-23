// components/analytics/RouteTracker.jsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { pageview, GA_ID } from "@/lib/gtag";

export default function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");

    if (typeof pageview === "function") {
      pageview(url);
    } else if (
      typeof window !== "undefined" &&
      typeof window.gtag === "function" &&
      GA_ID
    ) {
      // fallback
      window.gtag("config", GA_ID, { page_path: url });
    }
  }, [pathname, searchParams]);

  return null;
}
