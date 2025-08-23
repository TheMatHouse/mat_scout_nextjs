// components/analytics/GAProvider.jsx
"use client";

import Script from "next/script";
import { GA_ID } from "@/lib/gtag";

export default function GAProvider() {
  if (!GA_ID) return null;

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <>
      {/* Load gtag */}
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
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            send_page_view: false, // we'll send manually on route change
            debug_mode: ${isDev ? "true" : "false"}
          });
        `}
      </Script>
    </>
  );
}
