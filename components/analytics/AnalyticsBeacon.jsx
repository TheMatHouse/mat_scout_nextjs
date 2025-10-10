// components/analytics/AnalyticsBeacon.jsx
"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_ID, pageview } from "@/lib/gtag";
import { sendAnalyticsBeacon } from "@/lib/analytics/client";

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const last = useRef("");

  // Send on first mount
  useEffect(() => {
    if (!pathname) return;
    last.current = pathname;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    // Fire GA page_view
    pageview(url);
    // Keep your existing server-side beacon
    sendAnalyticsBeacon({ path: url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send on route change
  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    pageview(url);
    sendAnalyticsBeacon({ path: url });
  }, [pathname, searchParams]);

  // Load GA only if we have an ID at build time
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga-init"
        strategy="afterInteractive"
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // We'll manually send page_view from React (above)
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
