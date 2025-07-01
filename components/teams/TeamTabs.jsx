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
    <nav className="mb-8 border-b border-gray-200 dark:border-zinc-700 overflow-x-auto">
      <ul className="flex gap-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`inline-block py-2 px-4 text-sm font-medium rounded-t-md transition 
                  ${
                    isActive
                      ? "text-ms-light-red border-b-2 border-ms-light-red"
                      : "text-gray-600 dark:text-gray-300 hover:text-ms-light-red hover:border-b-2 hover:border-ms-light-red"
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
