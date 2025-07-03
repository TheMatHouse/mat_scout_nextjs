// components/teams/TeamTabs.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Renders the team page tabs and highlights the active one.
 */
export default function TeamTabs({ tabs }) {
  const pathname = usePathname();

  return (
    <nav className="mb-8 border-b border-gray-300 dark:border-zinc-700 overflow-x-auto">
      <ul className="flex gap-2 sm:gap-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`inline-block px-4 py-2 text-sm sm:text-base font-semibold rounded-t-md transition-all duration-200
                  ${
                    isActive
                      ? "border-b-2 border-ms-light-red text-ms-light-red dark:text-ms-light-red"
                      : "border-b-2 border-transparent text-gray-600 dark:text-gray-300 hover:text-ms-light-red hover:border-ms-light-red hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:shadow-sm"
                  }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
