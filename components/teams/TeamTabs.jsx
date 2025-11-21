"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeamTabs({ tabs }) {
  const pathname = usePathname() || "/";

  // Remove trailing slash except for root "/"
  const clean = (s) => (s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s);

  /**
   * Correct active-tab detection:
   *
   *  • For root team page (/teams/[slug]):
   *       → ONLY match exact path
   *
   *  • For deeper tabs (scouting-reports, members, updates, coach-notes)
   *       → match base or deeper nested pages
   */
  const isActivePath = (current, base) => {
    const p = clean(current);
    const b = clean(base);

    // ROOT TEAM PAGE = /teams/<slug>
    // That is exactly 3 segments: ["", "teams", "slug"]
    const isRootTab = b.split("/").length === 3;

    if (isRootTab) {
      return p === b; // exact match ONLY
    }

    // Nested tabs → match exact or deeper pages
    return p === b || p.startsWith(b + "/");
  };

  return (
    <nav className="flex gap-6 px-4 py-3 border-b border-gray-300 dark:border-gray-700 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = isActivePath(pathname, tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative pb-2 font-medium transition-colors ${
              isActive
                ? "text-blue-600 dark:text-[var(--ms-light-red)]"
                : "text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-[var(--ms-light-red)]"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-[var(--ms-light-red)]"></span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
