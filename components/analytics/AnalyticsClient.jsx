"use client";

import dynamic from "next/dynamic";

/**
 * Client-only analytics loader
 * - Never runs on the server
 * - Cannot crash Server Components
 */
const AnalyticsBeacon = dynamic(() => import("./AnalyticsBeacon"), {
  ssr: false,
});

export default function AnalyticsClient() {
  return <AnalyticsBeacon />;
}
