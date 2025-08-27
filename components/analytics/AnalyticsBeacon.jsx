// components/analytics/AnalyticsBeacon.jsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sendAnalyticsBeacon } from "@/lib/analytics/client";

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const last = useRef("");

  // send on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;
    last.current = pathname;
    sendAnalyticsBeacon({ path: pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // send on route change
  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    sendAnalyticsBeacon({ path: pathname });
  }, [pathname]);

  return null;
}
