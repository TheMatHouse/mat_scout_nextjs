"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
  Mail,
  Megaphone,
} from "lucide-react";
import clsx from "clsx";

const PROD_ORIGIN =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DOMAIN || "" : "";

export default function ShareMenu({ url, title, text, className = "" }) {
  const [copied, setCopied] = useState(false);
  const [effectiveUrl, setEffectiveUrl] = useState(url || "");
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If a full url prop was provided, normalize it against current origin
    if (url) {
      try {
        const absolute = new URL(url, window.location.origin).toString();
        setEffectiveUrl(absolute);
        return;
      } catch {
        setEffectiveUrl(url);
        return;
      }
    }

    // No url prop: use current path.
    // On localhost -> switch to production origin so OG fetch works.
    const { hostname, pathname, search } = window.location;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    const origin =
      isLocal && PROD_ORIGIN
        ? PROD_ORIGIN // e.g., https://matscout.com
        : window.location.origin;

    const absolute = new URL(`${pathname}${search}`, origin).toString();
    setEffectiveUrl(absolute);
  }, [url]);

  const shareLinks = useMemo(() => {
    const u = encodeURIComponent(effectiveUrl || "");
    const t = encodeURIComponent(title || "");
    const d = encodeURIComponent(text || "");
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
      twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
      email: `mailto:?subject=${t}&body=${d}%0A%0A${u}`,
    };
  }, [effectiveUrl, title, text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ok = window.prompt("Copy link:", effectiveUrl);
      if (ok !== null) setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return handleCopy();
    try {
      await navigator.share({ title, text, url: effectiveUrl });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <details className={clsx("relative", className)}>
      <summary className="list-none inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
        <Share2 className="w-4 h-4" />
        Share
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1">
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>

        <button
          onClick={handleNativeShare}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
        >
          <Megaphone className="w-4 h-4" />
          Native share
        </button>

        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LinkIcon className="w-4 h-4" />
          Share on Facebook
        </a>

        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LinkIcon className="w-4 h-4" />
          Share on X (Twitter)
        </a>

        <a
          href={shareLinks.reddit}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LinkIcon className="w-4 h-4" />
          Share on Reddit
        </a>

        <a
          href={shareLinks.email}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Mail className="w-4 h-4" />
          Share via Email
        </a>
      </div>
    </details>
  );
}
